import { SignedTransactionInBlock } from './transaction';

/**
 * Unsigned block header.
 */
export interface BlockHeader {
    previous: string; // block_id_type
    timestamp: string; // time_point_sec
    witness: string;
    transaction_merkle_root: string; // checksum_type
    extensions: any[]; // block_header_extensions_type
}

/**
 * Signed block header.
 */
export interface SignedBlockHeader extends BlockHeader {
    witness_signature: string; // signature_type
}

/**
 * Full signed block.
 */
export interface SignedBlock extends SignedBlockHeader {
    ref_block_num: number;
    ref_block_prefix: number;
    expiration: string;
    block_id: string;
    signing_key: string;
    transaction_ids: string[];
    transactions: SignedTransactionInBlock[];
}
