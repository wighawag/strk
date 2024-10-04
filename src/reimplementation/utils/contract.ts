import { CompiledContract, CompiledSierraCasm } from "starknet-core/types";
import {
  computeCompiledClassHash,
  computeContractClassHash,
} from "starknet-core/utils/hash";

export type DeclareContractPayload = {
  contract: CompiledContract | string;
  classHash?: string;
  casm: CompiledSierraCasm;
  compiledClassHash?: string;
};

/**
 * DeclareContractPayload with classHash or contract defined
 */
export type ContractClassIdentifier =
  | DeclareContractPayload
  | { classHash: string };

export type CompleteDeclareContractPayload = {
  contract: CompiledContract | string;
  classHash: string;
  casm: CompiledSierraCasm;
  compiledClassHash?: string;
};

/**
 * Extracts contract hashes from `DeclareContractPayload`.
 * (Taken from starknet.js)
 *
 * @param {DeclareContractPayload} payload - The payload containing contract information.
 * @return {CompleteDeclareContractPayload} - The `CompleteDeclareContractPayload` with extracted contract hashes.
 * @throws {Error} - If extraction of compiledClassHash or classHash fails.
 * @example
 * ```typescript
 * const result = extractContractHashes(contract);
 * // result = {
 * //   contract: ...,
 * //   classHash: ...,
 * //   casm: ...,
 * //   compiledClassHash: ...,
 * // }
 * ```
 */
export function extractContractHashes(
  payload: DeclareContractPayload
): CompleteDeclareContractPayload {
  const response = { ...payload } as CompleteDeclareContractPayload;

  if (!payload.compiledClassHash) {
    response.compiledClassHash = computeCompiledClassHash(payload.casm);
  }

  response.classHash =
    payload.classHash ?? computeContractClassHash(payload.contract);

  return response;
}
