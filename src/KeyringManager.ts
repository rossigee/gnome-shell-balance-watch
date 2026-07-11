import Secret from '@girs/secret-1';

const ATTRIBUTE_ACCOUNT_ID = 'account-id';

export async function storeApiKey(accountId: string, apiKey: string): Promise<void> {
  await Secret.password_store(
    null,
    { [ATTRIBUTE_ACCOUNT_ID]: accountId },
    Secret.COLLECTION_DEFAULT,
    `Balance Watch - ${accountId}`,
    apiKey,
  );
}

export async function retrieveApiKey(accountId: string): Promise<string | null> {
  const result = await Secret.password_lookup(null, { [ATTRIBUTE_ACCOUNT_ID]: accountId });
  return result || null;
}

export async function deleteApiKey(accountId: string): Promise<void> {
  await Secret.password_clear(null, { [ATTRIBUTE_ACCOUNT_ID]: accountId });
}

export async function hasStoredKey(accountId: string): Promise<boolean> {
  const key = await retrieveApiKey(accountId);
  return key !== null;
}