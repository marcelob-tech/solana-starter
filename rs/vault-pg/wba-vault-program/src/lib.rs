use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg,
    program::invoke,
    program::invoke_signed,
    program_error::ProgramError,
    pubkey::Pubkey,
    rent::Rent,
    system_instruction,
    sysvar::Sysvar,
};

use spl_associated_token_account::get_associated_token_address;
use spl_token::instruction as token_instruction;

solana_program::declare_id!("26fuYGrUBSa5wjzeUNu42MaQQzraX4kfchtTM9NTUKbM");

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct Vault {
    pub owner: Pubkey,
    pub auth_bump: u8,
    pub vault_bump: u8,
    pub score: u8,
}

impl Vault {
    pub fn space() -> usize {
        32 + 1 + 1 + 1
    }
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub enum WbaVaultInstruction {
    Initialize,
    Deposit { amount: u64 },
    Withdraw { amount: u64 },
    DepositSpl { amount: u64 },
    WithdrawSpl { amount: u64 },
    DepositNft,
    WithdrawNft,
    CloseAccount,
}

#[derive(Debug)]
pub enum WbaVaultError {
    InvalidSystemProgram,
    InvalidPda,
    InvalidSigner,
    InvalidVaultStateOwner,
    InvalidTokenProgram,
    InvalidTokenAccount,
    InvalidMetadataProgram,
}

impl From<WbaVaultError> for ProgramError {
    fn from(_: WbaVaultError) -> Self {
        ProgramError::Custom(0)
    }
}

#[cfg(feature = "onchain")]
solana_program::entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let ix = WbaVaultInstruction::try_from_slice(instruction_data)
        .map_err(|_| ProgramError::InvalidInstructionData)?;

    match ix {
        WbaVaultInstruction::Initialize => initialize(program_id, accounts),
        WbaVaultInstruction::Deposit { amount } => deposit(program_id, accounts, amount),
        WbaVaultInstruction::Withdraw { amount } => withdraw(program_id, accounts, amount),
        WbaVaultInstruction::DepositSpl { amount } => deposit_spl(program_id, accounts, amount),
        WbaVaultInstruction::WithdrawSpl { amount } => withdraw_spl(program_id, accounts, amount),
        WbaVaultInstruction::DepositNft => deposit_nft(program_id, accounts),
        WbaVaultInstruction::WithdrawNft => withdraw_nft(program_id, accounts),
        WbaVaultInstruction::CloseAccount => close_account(program_id, accounts),
    }
}

fn assert_system_program(system_program: &AccountInfo) -> ProgramResult {
    if system_program.key != &solana_program::system_program::id() {
        return Err(WbaVaultError::InvalidSystemProgram.into());
    }
    Ok(())
}

fn assert_token_program(token_program: &AccountInfo) -> ProgramResult {
    if token_program.key != &spl_token::id() {
        return Err(WbaVaultError::InvalidTokenProgram.into());
    }
    Ok(())
}

fn load_vault_state(program_id: &Pubkey, owner: &AccountInfo, vault_state: &AccountInfo) -> Result<Vault, ProgramError> {
    if vault_state.owner != program_id {
        return Err(WbaVaultError::InvalidVaultStateOwner.into());
    }

    let state = Vault::try_from_slice(&vault_state.data.borrow())
        .map_err(|_| ProgramError::InvalidAccountData)?;

    if state.owner != *owner.key {
        return Err(WbaVaultError::InvalidSigner.into());
    }

    Ok(state)
}

fn assert_vault_pdas(program_id: &Pubkey, vault_state: &AccountInfo, vault_auth: &AccountInfo, vault: &AccountInfo) -> ProgramResult {
    let (expected_vault_auth, _auth_bump) =
        Pubkey::find_program_address(&[b"auth", vault_state.key.as_ref()], program_id);
    if vault_auth.key != &expected_vault_auth {
        return Err(WbaVaultError::InvalidPda.into());
    }

    let (expected_vault, _vault_bump) =
        Pubkey::find_program_address(&[b"vault", vault_auth.key.as_ref()], program_id);
    if vault.key != &expected_vault {
        return Err(WbaVaultError::InvalidPda.into());
    }

    Ok(())
}

fn initialize(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let mut accounts_iter = accounts.iter();
    let owner = next_account_info(&mut accounts_iter)?;
    let vault_state = next_account_info(&mut accounts_iter)?;
    let vault_auth = next_account_info(&mut accounts_iter)?;
    let vault = next_account_info(&mut accounts_iter)?;
    let system_program = next_account_info(&mut accounts_iter)?;

    if !owner.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    if !vault_state.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    assert_system_program(system_program)?;

    // vaultAuth PDA = ["auth", vaultState]
    let (expected_vault_auth, auth_bump) =
        Pubkey::find_program_address(&[b"auth", vault_state.key.as_ref()], program_id);

    if vault_auth.key != &expected_vault_auth {
        return Err(WbaVaultError::InvalidPda.into());
    }

    // vault PDA = ["vault", vaultAuth]
    let (expected_vault, vault_bump) =
        Pubkey::find_program_address(&[b"vault", vault_auth.key.as_ref()], program_id);

    if vault.key != &expected_vault {
        return Err(WbaVaultError::InvalidPda.into());
    }

    // Create vault_state account (program-owned) if needed.
    if vault_state.owner != program_id {
        let rent = Rent::get()?;
        let space = Vault::space();
        let lamports = rent.minimum_balance(space);

        invoke(
            &system_instruction::create_account(
                owner.key,
                vault_state.key,
                lamports,
                space as u64,
                program_id,
            ),
            &[owner.clone(), vault_state.clone(), system_program.clone()],
        )?;
    }

    // Create vault PDA account (program-owned, holds lamports)
    if vault.owner != program_id {
        let rent = Rent::get()?;
        let space = 0usize;
        let lamports = rent.minimum_balance(space);

        invoke_signed(
            &system_instruction::create_account(
                owner.key,
                vault.key,
                lamports,
                space as u64,
                program_id,
            ),
            &[owner.clone(), vault.clone(), system_program.clone()],
            &[&[b"vault", vault_auth.key.as_ref(), &[vault_bump]]],
        )?;
    }

    let state = Vault {
        owner: *owner.key,
        auth_bump,
        vault_bump,
        score: 0,
    };

    state
        .serialize(&mut &mut vault_state.data.borrow_mut()[..])
        .map_err(|_| ProgramError::AccountDataTooSmall)?;

    msg!("Vault initialized");
    Ok(())
}

fn deposit(program_id: &Pubkey, accounts: &[AccountInfo], amount: u64) -> ProgramResult {
    let mut accounts_iter = accounts.iter();
    let owner = next_account_info(&mut accounts_iter)?;
    let vault_state = next_account_info(&mut accounts_iter)?;
    let vault_auth = next_account_info(&mut accounts_iter)?;
    let vault = next_account_info(&mut accounts_iter)?;
    let system_program = next_account_info(&mut accounts_iter)?;

    if !owner.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    assert_system_program(system_program)?;
    let _state = load_vault_state(program_id, owner, vault_state)?;
    assert_vault_pdas(program_id, vault_state, vault_auth, vault)?;

    invoke(
        &system_instruction::transfer(owner.key, vault.key, amount),
        &[owner.clone(), vault.clone(), system_program.clone()],
    )?;

    msg!("Deposit successful");
    Ok(())
}

fn withdraw(program_id: &Pubkey, accounts: &[AccountInfo], amount: u64) -> ProgramResult {
    let mut accounts_iter = accounts.iter();
    let owner = next_account_info(&mut accounts_iter)?;
    let vault_state = next_account_info(&mut accounts_iter)?;
    let vault_auth = next_account_info(&mut accounts_iter)?;
    let vault = next_account_info(&mut accounts_iter)?;
    let system_program = next_account_info(&mut accounts_iter)?;

    if !owner.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    if system_program.key != &solana_program::system_program::id() {
        return Err(WbaVaultError::InvalidSystemProgram.into());
    }

    if vault_state.owner != program_id {
        return Err(WbaVaultError::InvalidVaultStateOwner.into());
    }

    let state = Vault::try_from_slice(&vault_state.data.borrow())
        .map_err(|_| ProgramError::InvalidAccountData)?;

    if state.owner != *owner.key {
        return Err(WbaVaultError::InvalidSigner.into());
    }

    let (expected_vault_auth, _auth_bump) =
        Pubkey::find_program_address(&[b"auth", vault_state.key.as_ref()], program_id);

    if vault_auth.key != &expected_vault_auth {
        return Err(WbaVaultError::InvalidPda.into());
    }

    let (expected_vault, _vault_bump) =
        Pubkey::find_program_address(&[b"vault", vault_auth.key.as_ref()], program_id);

    if vault.key != &expected_vault {
        return Err(WbaVaultError::InvalidPda.into());
    }

    invoke_signed(
        &system_instruction::transfer(vault.key, owner.key, amount),
        &[vault.clone(), owner.clone(), system_program.clone()],
        &[&[b"vault", vault_auth.key.as_ref(), &[state.vault_bump]]],
    )?;

    msg!("Withdraw successful");
    Ok(())
}

fn deposit_spl(program_id: &Pubkey, accounts: &[AccountInfo], amount: u64) -> ProgramResult {
    let mut accounts_iter = accounts.iter();
    let owner = next_account_info(&mut accounts_iter)?;
    let owner_ata = next_account_info(&mut accounts_iter)?;
    let vault_state = next_account_info(&mut accounts_iter)?;
    let vault_auth = next_account_info(&mut accounts_iter)?;
    let vault_ata = next_account_info(&mut accounts_iter)?;
    let token_mint = next_account_info(&mut accounts_iter)?;
    let token_program = next_account_info(&mut accounts_iter)?;
    let _associated_token_program = next_account_info(&mut accounts_iter)?;
    let system_program = next_account_info(&mut accounts_iter)?;

    if !owner.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    assert_system_program(system_program)?;
    assert_token_program(token_program)?;
    let _state = load_vault_state(program_id, owner, vault_state)?;

    let (expected_vault_auth, _auth_bump) =
        Pubkey::find_program_address(&[b"auth", vault_state.key.as_ref()], program_id);
    if vault_auth.key != &expected_vault_auth {
        return Err(WbaVaultError::InvalidPda.into());
    }

    let expected_owner_ata = get_associated_token_address(owner.key, token_mint.key);
    if owner_ata.key != &expected_owner_ata {
        return Err(WbaVaultError::InvalidTokenAccount.into());
    }

    let expected_vault_ata = get_associated_token_address(vault_auth.key, token_mint.key);
    if vault_ata.key != &expected_vault_ata {
        return Err(WbaVaultError::InvalidTokenAccount.into());
    }

    let ix = token_instruction::transfer(
        token_program.key,
        owner_ata.key,
        vault_ata.key,
        owner.key,
        &[],
        amount,
    )?;

    invoke(
        &ix,
        &[
            owner_ata.clone(),
            vault_ata.clone(),
            owner.clone(),
            token_program.clone(),
        ],
    )?;

    msg!("Deposit SPL successful");
    Ok(())
}

fn withdraw_spl(program_id: &Pubkey, accounts: &[AccountInfo], amount: u64) -> ProgramResult {
    let mut accounts_iter = accounts.iter();
    let owner = next_account_info(&mut accounts_iter)?;
    let owner_ata = next_account_info(&mut accounts_iter)?;
    let vault_state = next_account_info(&mut accounts_iter)?;
    let vault_auth = next_account_info(&mut accounts_iter)?;
    let vault_ata = next_account_info(&mut accounts_iter)?;
    let token_mint = next_account_info(&mut accounts_iter)?;
    let token_program = next_account_info(&mut accounts_iter)?;
    let _associated_token_program = next_account_info(&mut accounts_iter)?;
    let system_program = next_account_info(&mut accounts_iter)?;

    if !owner.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    assert_system_program(system_program)?;
    assert_token_program(token_program)?;
    let state = load_vault_state(program_id, owner, vault_state)?;

    let (expected_vault_auth, _auth_bump) =
        Pubkey::find_program_address(&[b"auth", vault_state.key.as_ref()], program_id);
    if vault_auth.key != &expected_vault_auth {
        return Err(WbaVaultError::InvalidPda.into());
    }

    let expected_owner_ata = get_associated_token_address(owner.key, token_mint.key);
    if owner_ata.key != &expected_owner_ata {
        return Err(WbaVaultError::InvalidTokenAccount.into());
    }

    let expected_vault_ata = get_associated_token_address(vault_auth.key, token_mint.key);
    if vault_ata.key != &expected_vault_ata {
        return Err(WbaVaultError::InvalidTokenAccount.into());
    }

    let ix = token_instruction::transfer(
        token_program.key,
        vault_ata.key,
        owner_ata.key,
        vault_auth.key,
        &[],
        amount,
    )?;

    invoke_signed(
        &ix,
        &[
            vault_ata.clone(),
            owner_ata.clone(),
            vault_auth.clone(),
            token_program.clone(),
        ],
        &[&[b"auth", vault_state.key.as_ref(), &[state.auth_bump]]],
    )?;

    msg!("Withdraw SPL successful");
    Ok(())
}

fn deposit_nft(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    // Same as depositSpl but amount is fixed to 1 and we additionally validate
    // metadata/master edition PDAs were derived correctly.
    let mut accounts_iter = accounts.iter();
    let owner = next_account_info(&mut accounts_iter)?;
    let owner_ata = next_account_info(&mut accounts_iter)?;
    let vault_state = next_account_info(&mut accounts_iter)?;
    let vault_auth = next_account_info(&mut accounts_iter)?;
    let vault_ata = next_account_info(&mut accounts_iter)?;
    let token_mint = next_account_info(&mut accounts_iter)?;
    let nft_metadata = next_account_info(&mut accounts_iter)?;
    let nft_master_edition = next_account_info(&mut accounts_iter)?;
    let metadata_program = next_account_info(&mut accounts_iter)?;
    let token_program = next_account_info(&mut accounts_iter)?;
    let _associated_token_program = next_account_info(&mut accounts_iter)?;
    let system_program = next_account_info(&mut accounts_iter)?;

    if !owner.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    assert_system_program(system_program)?;
    assert_token_program(token_program)?;
    let _state = load_vault_state(program_id, owner, vault_state)?;

    let (expected_vault_auth, _auth_bump) =
        Pubkey::find_program_address(&[b"auth", vault_state.key.as_ref()], program_id);
    if vault_auth.key != &expected_vault_auth {
        return Err(WbaVaultError::InvalidPda.into());
    }

    // Validate ATAs.
    let expected_owner_ata = get_associated_token_address(owner.key, token_mint.key);
    if owner_ata.key != &expected_owner_ata {
        return Err(WbaVaultError::InvalidTokenAccount.into());
    }

    let expected_vault_ata = get_associated_token_address(vault_auth.key, token_mint.key);
    if vault_ata.key != &expected_vault_ata {
        return Err(WbaVaultError::InvalidTokenAccount.into());
    }

    // Validate Metadata PDAs under the provided metadata program.
    let (expected_metadata, _bump) = Pubkey::find_program_address(
        &[b"metadata", metadata_program.key.as_ref(), token_mint.key.as_ref()],
        metadata_program.key,
    );
    if nft_metadata.key != &expected_metadata {
        return Err(WbaVaultError::InvalidPda.into());
    }

    let (expected_edition, _bump) = Pubkey::find_program_address(
        &[
            b"metadata",
            metadata_program.key.as_ref(),
            token_mint.key.as_ref(),
            b"edition",
        ],
        metadata_program.key,
    );
    if nft_master_edition.key != &expected_edition {
        return Err(WbaVaultError::InvalidPda.into());
    }

    // We only validate the metadata program is executable as a sanity check.
    if !metadata_program.executable {
        return Err(WbaVaultError::InvalidMetadataProgram.into());
    }

    let ix = token_instruction::transfer(
        token_program.key,
        owner_ata.key,
        vault_ata.key,
        owner.key,
        &[],
        1,
    )?;

    invoke(
        &ix,
        &[
            owner_ata.clone(),
            vault_ata.clone(),
            owner.clone(),
            token_program.clone(),
        ],
    )?;

    msg!("Deposit NFT successful");
    Ok(())
}

fn withdraw_nft(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    // Same as withdrawSpl but amount fixed to 1 and validate metadata PDAs.
    let mut accounts_iter = accounts.iter();
    let owner = next_account_info(&mut accounts_iter)?;
    let owner_ata = next_account_info(&mut accounts_iter)?;
    let vault_state = next_account_info(&mut accounts_iter)?;
    let vault_auth = next_account_info(&mut accounts_iter)?;
    let vault_ata = next_account_info(&mut accounts_iter)?;
    let token_mint = next_account_info(&mut accounts_iter)?;
    let nft_metadata = next_account_info(&mut accounts_iter)?;
    let nft_master_edition = next_account_info(&mut accounts_iter)?;
    let metadata_program = next_account_info(&mut accounts_iter)?;
    let token_program = next_account_info(&mut accounts_iter)?;
    let _associated_token_program = next_account_info(&mut accounts_iter)?;
    let system_program = next_account_info(&mut accounts_iter)?;

    if !owner.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    assert_system_program(system_program)?;
    assert_token_program(token_program)?;
    let state = load_vault_state(program_id, owner, vault_state)?;

    let (expected_vault_auth, _auth_bump) =
        Pubkey::find_program_address(&[b"auth", vault_state.key.as_ref()], program_id);
    if vault_auth.key != &expected_vault_auth {
        return Err(WbaVaultError::InvalidPda.into());
    }

    let expected_owner_ata = get_associated_token_address(owner.key, token_mint.key);
    if owner_ata.key != &expected_owner_ata {
        return Err(WbaVaultError::InvalidTokenAccount.into());
    }

    let expected_vault_ata = get_associated_token_address(vault_auth.key, token_mint.key);
    if vault_ata.key != &expected_vault_ata {
        return Err(WbaVaultError::InvalidTokenAccount.into());
    }

    let (expected_metadata, _bump) = Pubkey::find_program_address(
        &[b"metadata", metadata_program.key.as_ref(), token_mint.key.as_ref()],
        metadata_program.key,
    );
    if nft_metadata.key != &expected_metadata {
        return Err(WbaVaultError::InvalidPda.into());
    }

    let (expected_edition, _bump) = Pubkey::find_program_address(
        &[
            b"metadata",
            metadata_program.key.as_ref(),
            token_mint.key.as_ref(),
            b"edition",
        ],
        metadata_program.key,
    );
    if nft_master_edition.key != &expected_edition {
        return Err(WbaVaultError::InvalidPda.into());
    }

    if !metadata_program.executable {
        return Err(WbaVaultError::InvalidMetadataProgram.into());
    }

    let ix = token_instruction::transfer(
        token_program.key,
        vault_ata.key,
        owner_ata.key,
        vault_auth.key,
        &[],
        1,
    )?;

    invoke_signed(
        &ix,
        &[
            vault_ata.clone(),
            owner_ata.clone(),
            vault_auth.clone(),
            token_program.clone(),
        ],
        &[&[b"auth", vault_state.key.as_ref(), &[state.auth_bump]]],
    )?;

    msg!("Withdraw NFT successful");
    Ok(())
}

fn close_account(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let mut accounts_iter = accounts.iter();
    let owner = next_account_info(&mut accounts_iter)?;
    let close_vault_state = next_account_info(&mut accounts_iter)?;
    let vault_state = next_account_info(&mut accounts_iter)?;
    let system_program = next_account_info(&mut accounts_iter)?;

    if !owner.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    assert_system_program(system_program)?;

    // Must be program-owned so we can mutate lamports/data.
    let _state = load_vault_state(program_id, owner, vault_state)?;

    // Move lamports to the close destination (often the owner).
    let lamports = **vault_state.lamports.borrow();
    **vault_state.lamports.borrow_mut() = 0;
    **close_vault_state.lamports.borrow_mut() = close_vault_state
        .lamports()
        .checked_add(lamports)
        .ok_or(ProgramError::InvalidArgument)?;

    // Zero out data (best-effort "close").
    let mut data = vault_state.data.borrow_mut();
    for b in data.iter_mut() {
        *b = 0;
    }

    msg!("Vault state closed");
    Ok(())
}
