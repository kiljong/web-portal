import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import 'jest-extended';

import { store } from 'src/modules/store/store';
import {
  GetOverviewSubjectParams,
  overviewSubjectSlice,
  useOverviewSubject,
} from 'src/modules/overview/overview-subject/overviewSubject.slice';

const setUpHook = (args: GetOverviewSubjectParams | false) =>
  renderHook(
    (fetchArgs: GetOverviewSubjectParams) => useOverviewSubject({ fetchArgs: fetchArgs || args }),
    {
      wrapper: ({ children }: React.PropsWithChildren<unknown>) => (
        <Provider store={store}>{children}</Provider>
      ),
    }
  );

const unsetHook = (hook: ReturnType<typeof setUpHook>) => {
  hook.result.current.reset();
  hook.unmount();
};

describe('overviewSubjectSlice', () => {
  it('should have initial state', async () => {
    expect(overviewSubjectSlice.reducer(undefined, { type: 0 })).toEqual({
      fetchArgs: null,
      prevFetchArgs: null,
    });
  });
});

const args = {
  studyId: 'study-id',
  id: '002-20220512-a',
};

describe('useOverviewSubject', () => {
  let hook: ReturnType<typeof setUpHook>;

  afterEach(() => {
    act(() => unsetHook(hook));
  });

  it('should create initial state', () => {
    hook = setUpHook(false);

    expect(hook.result.current).toMatchObject({
      isLoading: false,
    });
  });

  it('should fetch data from API', async () => {
    hook = setUpHook(args);

    expect(hook.result.current).toMatchObject({
      isLoading: true,
    });

    await waitFor(() => expect(hook.result.current.isLoading).toBeFalsy());

    expect(hook.result.current).toMatchObject({
      isLoading: false,
      data: expect.objectContaining({
        avgBloodPressure: expect.toBeOneOf([expect.any(Number), undefined]),
        avgBpm: expect.toBeOneOf([expect.any(Number), undefined]),
        avgSleepMins: expect.toBeOneOf([expect.any(Number), undefined]),
        avgSteps: expect.toBeOneOf([expect.any(Number), undefined]),
        email: expect.any(String),
        id: expect.any(String),
        lastSync: expect.any(Number),
        localTime: expect.any(Number),
      }),
    });
  });
});
