export const RECOVERED_IMAGE_FALLBACK = "/menu/recovered/fallback.webp";

const recoveredCloposImageIds = new Set([
  "05181778-275e-45d8-911b-446b313d9386",
  "0945bb7d-2e6c-4b5b-a8a2-1452cb60ccc7",
  "0ad418dd-b4ea-44d7-ad40-7b751873a2a9",
  "0b62a9ce-20f9-40e6-b710-447c43411cef",
  "10f7f8b5-4d55-485e-a41d-d704282fb6ed",
  "12acab35-df9f-42da-8b0a-349d2e82b02a",
  "12f10351-049d-40a0-8af9-3d8bc3642fa0",
  "180bee10-e8c1-40b9-9698-908e5605b84b",
  "19a8ee5f-753e-4519-92ad-b2aae35db906",
  "1a4c1a5f-ca6d-4759-8edb-440bf8b74efd",
  "1e13b776-004e-4109-8d35-e9b557c87e70",
  "21953654-7769-465a-b409-2132cf345ec5",
  "282f3312-6806-4ebe-a900-32554f8e49aa",
  "325e13ee-73e0-4fd3-a48c-7160d13a1ccf",
  "35f904c8-5b17-4e5c-a514-b8341eabb7e6",
  "3fd2f73a-53c0-4a3a-ac67-7b1a270e2c26",
  "3fe5b383-df21-4cd8-9f9d-14ab7a121219",
  "48657e17-0304-4e90-85e8-3ab30194d779",
  "49e07a00-2161-4f5e-a848-7d84f9e94168",
  "4b6ba0a5-b490-4fb4-b63d-bd785c3be8de",
  "54092f67-3fba-47d8-9615-b6127fe6558c",
  "6134fd54-77f6-4809-aa1d-6067a72e3c06",
  "6435b151-9f09-48f8-810b-f5f3392893d2",
  "6e140bcd-efcc-4451-8f2b-97c97506a4cf",
  "71c1d37c-1c1d-4941-bbe3-749c6a00f22a",
  "77e99413-ae48-4b69-9cd7-e97be79d7def",
  "7d846e9a-bdb2-44b6-a8d2-66f453153768",
  "80abded8-a88f-4575-9b81-70a04c2e9177",
  "81778b51-cb03-4b93-b910-85467ffa4f0d",
  "84d65c3e-421c-4cfa-8444-4a58f58a7a1b",
  "85813e09-5a05-4241-902f-20c4ebd61720",
  "8fc2f88d-724f-4ffa-8d69-01021623b4ab",
  "92e5dfc2-b1f7-4c93-af79-598c30b6c570",
  "97744ab2-24d4-4c0a-9c91-e547195ac50a",
  "99b5dfd9-8527-4e6e-9441-e72e382f2760",
  "99db878c-025e-4ecb-9cc5-381e8dfb6d2f",
  "9da2a387-ef56-4dd2-91b0-f4e0a8e65aba",
  "a0229f1b-77ce-40ba-9797-3ab30b71d589",
  "a5c6dc6f-0168-4d1f-aac6-4e23d6ca4acf",
  "ac2c2737-8b4c-434a-87e8-7d5d712dffb9",
  "af016a83-8fee-4491-980c-cf4a91b7ffc7",
  "b3da460a-0f25-4344-a0d6-411399f98a88",
  "c07d3e8d-e29d-4f9b-a3ff-d40fa0a07b3a",
  "c438db31-115d-4781-b441-31d4659760e6",
  "c4ccdb59-de63-4967-bb83-9beadae04efa",
  "c604d825-3a77-4984-9fd5-4dda5f09e9de",
  "c9f2285f-1d89-4b9a-80f5-f6cd4ce481d5",
  "ccc91e75-35c9-4254-ae81-d7a4589e7cad",
  "d1d723bd-65d4-422c-8279-a1f73b3d695f",
  "d891ec3d-be50-4317-bb9c-5083f36a1ed8",
  "dba93be5-ccd2-4992-a044-616bc8f244ce",
  "dc8928f9-530a-49dc-bbee-37925775abf7",
  "dd04f3fb-5c26-402d-bec4-046563ddfa91",
  "df462896-50c5-4573-a360-a169ab379945",
  "e0fdd0f5-a45c-4604-862f-88d9f0c58d68",
  "e17580e0-957d-4c64-87f1-80556715055a",
  "e5cb55b8-b97a-4e19-9271-f8fc4f4a9279",
  "ea6576c7-d816-4ef5-b56b-b253a5958504",
  "eb207139-77b1-4efd-a496-43da2c3ed8f3",
  "ede0ecf9-2db1-4f20-ac41-90106c51b27f",
  "fa66d6e3-7456-4148-ba5c-d6f03a36d1af",
  "fbdb84b3-bb9d-4e28-84b5-c19b48e8fd7b",
  "fcdf9e5f-93b5-4069-9d16-7decac432b38",
  "ff92d23f-9ace-4591-b7ba-c67da96a09d2"
]);

export function resolveRecoveredMenuImage(value) {
  const source = String(value || "");
  const match = source.match(/cdn-2\.clopos\.com\/[^/]+\/([0-9a-f-]{36})\/card32@2x\.jpg(?:[?#].*)?$/i);
  if (!match || !recoveredCloposImageIds.has(match[1])) return value || null;
  return `/menu/recovered/${match[1]}.webp`;
}

export function useRecoveredImageFallback(event) {
  const image = event.currentTarget;
  if (image.dataset.fallbackApplied === "true") return;
  image.dataset.fallbackApplied = "true";
  image.src = RECOVERED_IMAGE_FALLBACK;
}
