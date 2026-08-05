import { http, HttpResponse } from 'msw';

/**
 * Default handlers for the API the template talks to. They exist so a test never
 * touches the network: an integration test that depends on dummyjson.com being up
 * is a test that fails on a train.
 *
 * Individual tests override a route with `server.use(...)` to exercise a specific
 * failure. `onUnhandledRequest: 'error'` in server.ts makes any request that is
 * neither handled nor deliberately overridden fail loudly, which is what catches
 * "the component quietly calls a second endpoint" bugs.
 */
const BASE = 'https://api.test';

export const productFixture = {
  id: 1,
  title: 'Test product',
  description: 'A product used by tests.',
  category: 'test',
  price: 9.99,
  rating: 4.5,
  stock: 12,
  thumbnail: 'https://cdn.dummyjson.com/test.webp',
};

export const handlers = [
  http.get(`${BASE}/products`, ({ request }) => {
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get('limit') ?? 12);
    const skip = Number(url.searchParams.get('skip') ?? 0);

    return HttpResponse.json({
      products: [productFixture],
      total: 1,
      skip,
      limit,
    });
  }),

  http.get(`${BASE}/products/category-list`, () =>
    HttpResponse.json(['test', 'other']),
  ),

  http.get(`${BASE}/products/:id`, ({ params }) =>
    HttpResponse.json({ ...productFixture, id: Number(params.id) }),
  ),

  http.get(`${BASE}/auth/me`, () =>
    HttpResponse.json({
      id: 1,
      username: 'tester',
      email: 'tester@example.com',
      firstName: 'Test',
      lastName: 'User',
    }),
  ),
];
