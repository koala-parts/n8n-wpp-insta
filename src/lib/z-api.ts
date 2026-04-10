type ZApiContact = {
  name?: string | null;
  phone?: string | null;
};

type AddZApiContactPayload = {
  firstName: string;
  lastName?: string;
  phone: string;
};

function getZApiConfig() {
  const instance = process.env.Z_API_INSTANCE;
  const token = process.env.Z_API_TOKEN;
  const securityToken = process.env.Z_API_SECURITY_TOKEN;

  if (!instance || !token || !securityToken) {
    throw new Error("Z-API configuration missing (Z_API_INSTANCE/Z_API_TOKEN/Z_API_SECURITY_TOKEN)");
  }

  return { instance, token, securityToken };
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

async function zApiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const { instance, token, securityToken } = getZApiConfig();
  const url = `https://api.z-api.io/instances/${instance}/token/${token}/${path}`;

  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "client-token": securityToken,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (data && typeof data === "object" && "error" in data && String(data.error)) ||
      `Z-API request failed (${response.status})`;
    throw new Error(message);
  }

  return data as T;
}

export async function fetchZApiContacts() {
  const data = await zApiRequest<unknown>("contacts");
  const rows = Array.isArray(data) ? (data as ZApiContact[]) : [];

  return rows
    .map((row) => {
      const phone = normalizePhone(String(row.phone ?? ""));
      const name = String(row.name ?? "").trim();
      if (!phone) return null;

      return {
        phone,
        name: name || `Contato ${phone.slice(-4)}`,
      };
    })
    .filter((row): row is { name: string; phone: string } => row !== null);
}

export async function fetchZApiProfilePicture(phone: string) {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) return null;

  const encodedPhone = encodeURIComponent(normalizedPhone);
  const data = await zApiRequest<unknown>(`profile-picture?phone=${encodedPhone}`);

  if (!data) {
    return null;
  }

  const pickUrl = (value: unknown): string | null => {
    if (!value) return null;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return null;
      if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        return trimmed;
      }
      return null;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const resolved = pickUrl(item);
        if (resolved) return resolved;
      }
      return null;
    }

    if (typeof value === "object") {
      const record = value as Record<string, unknown>;
      const candidates = [
        record.profilePictureUrl,
        record.profilePictureURL,
        record.profilePicture,
        record.url,
        record.src,
        record.value,
      ];

      for (const candidate of candidates) {
        const resolved = pickUrl(candidate);
        if (resolved) return resolved;
      }
    }

    return null;
  };

  return pickUrl(data);
}

export async function addZApiContact(contact: AddZApiContactPayload) {
  const payload = [
    {
      firstName: contact.firstName.trim(),
      lastName: (contact.lastName ?? "").trim(),
      phone: normalizePhone(contact.phone),
    },
  ];

  if (!payload[0].firstName || !payload[0].phone) {
    throw new Error("firstName e phone sao obrigatorios");
  }

  return zApiRequest<unknown>("contacts/add", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

