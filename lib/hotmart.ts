import { env } from "@/lib/env";

const HOTMART_AUTH_URL =
  "https://api-sec-vlc.hotmart.com/security/oauth/token";

const HOTMART_API_URL =
  "https://developers.hotmart.com";

type HotmartTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
  jti?: string;
};

export type HotmartProduct = {
  id: number;
  name: string;
  ucode: string;
  status: string;
  created_at: number;
  format: string;
  is_subscription: boolean;
  warranty_period: number;
};

type HotmartProductsResponse = {
  items: HotmartProduct[];
  page_info?: {
    next_page_token?: string;
    prev_page_token?: string;
    results_per_page?: number;
    total_results?: number;
  };
};

export type HotmartOffer = {
  code?: string;
  name?: string;
  description?: string;
  price?: {
    value?: number;
    currency_code?: string;
  };
  payment_mode?: string;
  is_main?: boolean;
  is_main_offer?: boolean;
  is_smart_recovery_enabled?: boolean;
  is_currency_conversion_enabled?: boolean;
};

type HotmartOffersResponse = {
  items: HotmartOffer[];
  page_info?: {
    next_page_token?: string;
    prev_page_token?: string;
    results_per_page?: number;
    total_results?: number;
  };
};

export type HotmartProductWithOffer = {
  product: HotmartProduct;
  offer: HotmartOffer | null;
};

function cleanCredential(value: string): string {
  return value.trim().replace(/^["']|["']$/g, "");
}

function buildBasicAuthorization(value: string): string {
  const cleaned = cleanCredential(value);

  if (/^Basic\s+/i.test(cleaned)) {
    return cleaned;
  }

  return `Basic ${cleaned}`;
}

async function getAccessToken(): Promise<string> {
  const clientId = cleanCredential(env.hotmartClientId());
  const clientSecret = cleanCredential(env.hotmartClientSecret());
  const basic = buildBasicAuthorization(env.hotmartBasic());

  const url = new URL(HOTMART_AUTH_URL);

  url.searchParams.set("grant_type", "client_credentials");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("client_secret", clientSecret);

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: basic,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      `Hotmart OAuth falhou (${response.status}): ${body}`
    );
  }

  const data = (await response.json()) as HotmartTokenResponse;

  if (!data.access_token) {
    throw new Error(
      "A Hotmart não retornou um access_token."
    );
  }

  return data.access_token;
}

export async function getHotmartProducts(): Promise<HotmartProductsResponse> {
  const accessToken = await getAccessToken();

  const products: HotmartProduct[] = [];

  let pageToken: string | undefined;

  do {
    const url = new URL(
      `${HOTMART_API_URL}/products/api/v1/products`
    );

    url.searchParams.set("max_results", "50");

    if (pageToken) {
      url.searchParams.set("page_token", pageToken);
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.text();

      throw new Error(
        `Hotmart Produtos falhou (${response.status}): ${body}`
      );
    }

    const data =
      (await response.json()) as HotmartProductsResponse;

    products.push(...(data.items ?? []));

    pageToken = data.page_info?.next_page_token;
  } while (pageToken);

  return {
    items: products,
    page_info: {
      total_results: products.length,
      results_per_page: products.length,
    },
  };
}

export async function getHotmartProductOffers(
  ucode: string
): Promise<HotmartOffersResponse> {
  const accessToken = await getAccessToken();

  const offers: HotmartOffer[] = [];

  let pageToken: string | undefined;

  do {
    const url = new URL(
      `${HOTMART_API_URL}/products/api/v1/products/${encodeURIComponent(
        ucode
      )}/offers`
    );

    url.searchParams.set("max_results", "50");

    if (pageToken) {
      url.searchParams.set("page_token", pageToken);
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.text();

      throw new Error(
        `Hotmart Ofertas falhou (${response.status}): ${body}`
      );
    }

    const data =
      (await response.json()) as HotmartOffersResponse;

    offers.push(...(data.items ?? []));

    pageToken = data.page_info?.next_page_token;
  } while (pageToken);

  return {
    items: offers,
    page_info: {
      total_results: offers.length,
      results_per_page: offers.length,
    },
  };
}

/**
 * Localiza um produto específico pelo ID numérico da Hotmart.
 */
export async function getHotmartProductById(
  productId: number
): Promise<HotmartProduct | null> {
  const result = await getHotmartProducts();

  return (
    result.items.find(
      (product) => product.id === productId
    ) ?? null
  );
}

/**
 * Retorna a oferta principal do produto.
 *
 * Se a Hotmart não marcar nenhuma oferta como principal,
 * usamos a primeira oferta disponível.
 */
export async function getHotmartMainOffer(
  ucode: string
): Promise<HotmartOffer | null> {
  const result = await getHotmartProductOffers(ucode);

  if (!result.items.length) {
    return null;
  }

  return (
    result.items.find(
      (offer) =>
        offer.is_main_offer === true ||
        offer.is_main === true
    ) ?? result.items[0]
  );
}

/**
 * Consulta um produto da Hotmart e sua oferta principal.
 */
export async function getHotmartProductWithOffer(
  productId: number
): Promise<HotmartProductWithOffer | null> {
  const product = await getHotmartProductById(productId);

  if (!product) {
    return null;
  }

  const offer = await getHotmartMainOffer(
    product.ucode
  );

  return {
    product,
    offer,
  };
}