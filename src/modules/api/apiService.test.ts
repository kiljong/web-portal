import { ERROR_BASE_URL, request, setAuthProvider } from 'src/modules/api/apiService';

const responseData = {
  test: 'test',
};

const getPartOfResponseByUrl = (url: string) => {
  if (url.includes('auth-error')) {
    return {
      ok: false,
      status: 401,
    };
  }

  if (url.includes('error')) {
    return {
      ok: false,
      status: 500,
    };
  }

  return {
    ok: true,
    status: 200,
  };
};

const fetchFn = jest.fn((url: string) =>
  Promise.resolve({
    ...getPartOfResponseByUrl(url),
    headers: {},
    blob: () => Promise.resolve(responseData),
    json: () => Promise.resolve(responseData),
  })
);

beforeAll(() => {
  localStorage.setItem('API_URL', 'https://samsung.com/');

  global.fetch = fetchFn as unknown as typeof fetch;
});

describe('request', () => {
  it('should execute request', async () => {
    const { data } = await request({
      body: responseData,
      headers: {},
      method: 'GET',
      path: '/test',
      query: responseData,
    });

    expect(data).toEqual(responseData);
  });

  it('[NEGATIVE] should execute failure request', async () => {
    expect.assertions(2);
    try {
      const response = await request({
        body: responseData,
        headers: {},
        method: 'GET',
        path: '/error',
        query: responseData,
      });

      try {
        response.data;
      } catch (e) {
        expect(String(e)).toMatch('500');
      }

      try {
        response.checkError();
      } catch (e) {
        expect(String(e)).toMatch('500');
      }
    } catch {
      // do nothing
    }
  });

  const token = 'test-auth-token';

  const provider = {
    getBearerToken: jest.fn(() => token),
    onUnauthorizedError: jest.fn(),
  };

  it('should execute request with auth provider', async () => {
    fetchFn.mockClear();

    setAuthProvider(provider);

    await request({
      body: responseData,
      method: 'GET',
      path: 'test',
      query: responseData,
    });

    expect(fetchFn.mock.calls[0]).toMatchObject([
      'https://samsung.com/test?test=test',
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(responseData),
      },
    ]);
  });

  it('[NEGATIVE] should execute unauthorized request', async () => {
    provider.onUnauthorizedError.mockClear();

    setAuthProvider(provider);

    await request({
      body: responseData,
      method: 'GET',
      path: 'auth-error',
      query: responseData,
    });

    expect(provider.onUnauthorizedError).toHaveBeenCalledTimes(1);
  });

  it('[NEGATIVE] should execute failure request without `API_URL`', async () => {
    expect.assertions(3);
    const spy = jest.spyOn(console, 'error').mockImplementation();

    try {
      localStorage.removeItem('API_URL');

      const response = await request({
        body: responseData,
        headers: {},
        method: 'GET',
        path: '/test',
        query: responseData,
      });

      try {
        response.data;
      } catch (e) {
        expect(String(e)).toMatch(ERROR_BASE_URL);
      }

      try {
        response.checkError();
      } catch (e) {
        expect(String(e)).toMatch(ERROR_BASE_URL);
      }
    } catch (e) {
      // do nothing
    } finally {
      expect(console.error).toHaveBeenCalledWith(new Error(ERROR_BASE_URL));
    }

    spy.mockRestore();
  });
});
