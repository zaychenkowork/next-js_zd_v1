import { http, HttpResponse } from 'msw';

/**
 * Shared API stubs for the e2e suite. Kept in one place so a contract change is a
 * single edit, and deliberately *not* shared with the Vitest handlers in
 * `__tests__/setup/msw/` — those two suites mock different sides of the app
 * (server-side fetch vs jsdom fetch) and coupling them makes both harder to
 * reason about.
 */
const BASE = 'https://api.test';

export const PRODUCTS = Array.from({ length: 14 }, (_, index) => ({
  id: index + 1,
  title: `Product ${index + 1}`,
  description: `Description for product ${index + 1}.`,
  category: index % 2 === 0 ? 'beauty' : 'laptops',
  price: (index + 1) * 10,
  rating: 4,
  stock: index === 3 ? 0 : 10,
  thumbnail: 'https://cdn.dummyjson.com/test.webp',
}));

export const USER = {
  id: 1,
  username: 'emilys',
  email: 'emily@example.com',
  firstName: 'Emily',
  lastName: 'Johnson',
};

/**
 * A 1×1 GIF for whatever `next/image` asks the CDN for. Without it the image
 * optimiser fetches a URL that does not exist, answers 500, and fills the test
 * output with noise that looks like a real failure.
 */
const TRANSPARENT_GIF = Uint8Array.from([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00,
  0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0x21, 0xf9, 0x04, 0x01, 0x00, 0x00, 0x00,
  0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02,
  0x44, 0x01, 0x00, 0x3b,
]);

export const imageHandlers = [
  http.get('https://cdn.dummyjson.com/*', () =>
    HttpResponse.arrayBuffer(TRANSPARENT_GIF.buffer as ArrayBuffer, {
      headers: { 'content-type': 'image/gif' },
    }),
  ),
];

export const catalogHandlers = [
  ...imageHandlers,
  http.get(`${BASE}/products`, ({ request }) => {
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get('limit') ?? 12);
    const skip = Number(url.searchParams.get('skip') ?? 0);

    return HttpResponse.json({
      products: PRODUCTS.slice(skip, skip + limit),
      total: PRODUCTS.length,
      skip,
      limit,
    });
  }),

  http.get(`${BASE}/products/search`, ({ request }) => {
    const url = new URL(request.url);
    const query = (url.searchParams.get('q') ?? '').toLowerCase();
    const matches = PRODUCTS.filter((product) =>
      product.title.toLowerCase().includes(query),
    );

    return HttpResponse.json({
      products: matches,
      total: matches.length,
      skip: 0,
      limit: 12,
    });
  }),

  http.get(`${BASE}/products/category-list`, () =>
    HttpResponse.json(['beauty', 'laptops']),
  ),

  http.get(`${BASE}/products/:id`, ({ params }) => {
    const product = PRODUCTS.find((item) => item.id === Number(params.id));
    return product
      ? HttpResponse.json(product)
      : HttpResponse.json({ message: 'Not found' }, { status: 404 });
  }),
];

export const authHandlers = [
  http.post(`${BASE}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { username?: string };

    if (body.username !== USER.username) {
      return HttpResponse.json(
        { message: 'Invalid credentials' },
        { status: 400 },
      );
    }

    return HttpResponse.json({
      ...USER,
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
    });
  }),

  http.get(`${BASE}/auth/me`, ({ request }) =>
    request.headers.get('authorization')
      ? HttpResponse.json(USER)
      : HttpResponse.json({ message: 'Unauthorized' }, { status: 401 }),
  ),

  http.put(`${BASE}/users/:id`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ ...USER, ...body });
  }),
];
