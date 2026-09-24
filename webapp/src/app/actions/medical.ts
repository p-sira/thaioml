'use server';

import { auth } from '@clerk/nextjs/server';

const getBaseUrl = () => {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
};

const getHeaders = async () => {
  const authObj = await auth();
  const token = await authObj.getToken({ template: 'jwt-ask-library' });
  if (!token) throw new Error("Not authenticated");
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

export async function getSnomedSuggestion(query: string) {
  try {
    const headers = await getHeaders();
    const res = await fetch(`${getBaseUrl()}/snomed-suggest`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || `Failed to fetch SNOMED suggestion: ${res.statusText}`);
    }

    return await res.json();
  } catch (error) {
    console.error('SNOMED Suggestion Error:', error);
    throw error;
  }
}

export async function autoLinkContent(body: string, title?: string, snomedId?: string) {
  try {
    const headers = await getHeaders();
    const res = await fetch(`${getBaseUrl()}/auto-link`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ body, title, snomed_id: snomedId }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || `Failed to auto-link terms: ${res.statusText}`);
    }

    return await res.json();
  } catch (error) {
    console.error('Auto-Link Error:', error);
    throw error;
  }
}
