import { useCallback, useEffect } from 'react';
import _isEqual from 'lodash/isEqual';
import { ActionCreatorWithoutPayload, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Reducer } from 'redux';

import applyDefaultApiErrorHandlers from 'src/modules/api/applyDefaultApiErrorHandlers';
import { AppThunk, ErrorType, RootState, WithLoadableData } from 'src/modules/store';

import { useAppDispatch, useAppSelector } from './hooks';

type PublicDataSliceState<D> = WithLoadableData<D>;

type EmptyFetchArgs = null;

export type DataSliceState<D, A> = PublicDataSliceState<D> & {
  fetchArgs: A | EmptyFetchArgs;
  prevFetchArgs: A | EmptyFetchArgs;
};

type DataSliceOptions<D, N extends string, A> = {
  name: N;
  fetchData: (args: A) => Promise<D>;
};

type FetchActionOptions = {
  force?: boolean;
};

type HookParams<A> = {
  fetchArgs: A | boolean;
};

type DataSliceReturnType<D, N, A> = {
  name: N;
  reducer: Reducer<DataSliceState<D, A>>;
  stateSelector: (s: RootState) => DataSliceState<D, A>;
  hook: (params?: HookParams<A>) => PublicDataSliceState<D> & {
    fetch: (args: A, opts?: FetchActionOptions) => void;
    refetch: () => void;
    reset: () => void;
  };
  actions: {
    reset: ActionCreatorWithoutPayload;
    fetch: (args: A, opts?: FetchActionOptions) => AppThunk<Promise<void>>;
    refetch: () => AppThunk<Promise<void>>;
  };
};

const isFetchArgsEmpty = <D, A>(
  fetchArgs: DataSliceState<D, A>['fetchArgs']
): fetchArgs is EmptyFetchArgs => fetchArgs === null;

function createDataSlice<D extends object, N extends string, A = void>(
  options: DataSliceOptions<D, N, A>
): DataSliceReturnType<D, N, A> {
  const initialState: DataSliceState<D, A> = {
    fetchArgs: null,
    prevFetchArgs: null,
  };

  const slice = createSlice({
    name: options.name,
    initialState,
    reducers: {
      loadingStarted(state, action: PayloadAction<{ fetchArgs: A }>) {
        return Object.assign(state, {
          isLoading: true,
          fetchArgs: action.payload.fetchArgs,
          prevFetchArgs: { ...state.fetchArgs },
          error: undefined,
        });
      },
      loadingSuccess(state, action: PayloadAction<{ data: D }>) {
        return Object.assign(state, {
          isLoading: false,
          error: undefined,
          data: action.payload.data,
          prevFetchArgs: { ...state.fetchArgs },
        });
      },
      loadingFailed(state, action: PayloadAction<ErrorType>) {
        return Object.assign(state, {
          isLoading: false,
          error: action.payload,
          data: undefined,
          prevFetchArgs: { ...state.fetchArgs },
        });
      },
      reset() {
        return initialState;
      },
    },
  });

  const sliceStateSelector = (state: RootState) =>
    state[options.name as keyof RootState] as DataSliceState<D, A>;

  const fetchThunk =
    (args: A, opts?: FetchActionOptions): AppThunk<Promise<void>> =>
    async (dispatch, getState) => {
      if (!opts?.force) {
        const { fetchArgs: currentArgs } = sliceStateSelector(getState());

        // fetch only if this is a first fetch or args have been changed
        if (!isFetchArgsEmpty(currentArgs) && _isEqual(currentArgs, args)) {
          return;
        }
      }

      dispatch(slice.actions.loadingStarted({ fetchArgs: args }));
      try {
        const data = await options.fetchData(args);

        const { fetchArgs: currentArgs } = sliceStateSelector(getState());
        // discard received data
        // if another fetch with different args performed while fetchData was in progress
        if (_isEqual(args, currentArgs)) {
          dispatch(slice.actions.loadingSuccess({ data }));
        }
      } catch (err) {
        const { fetchArgs: currentArgs } = sliceStateSelector(getState());
        if (_isEqual(args, currentArgs)) {
          applyDefaultApiErrorHandlers(err);
          dispatch(
            slice.actions.loadingFailed(
              (err instanceof Error ? err.message : undefined) ||
                `Failed to fetch data ${options.name}`
            )
          );
        }
      }
    };

  const refetchThunk = (): AppThunk<Promise<void>> => async (dispatch, getState) => {
    const { fetchArgs } = sliceStateSelector(getState());
    if (!isFetchArgsEmpty(fetchArgs)) {
      await dispatch(fetchThunk(fetchArgs, { force: true }));
    }
  };

  const hook = (params?: HookParams<A>) => {
    const dispatch = useAppDispatch();
    const sliceState = useAppSelector((state) => sliceStateSelector(state));
    const isStudyListLoading = useAppSelector((state) => state.studies.isLoading);

    const hookResult = {
      fetch: useCallback(
        (args: A, opts?: FetchActionOptions) => dispatch(fetchThunk(args, opts)),
        [dispatch]
      ),
      refetch: useCallback(() => dispatch(refetchThunk()), [dispatch]),
      reset: useCallback(() => dispatch(slice.actions.reset()), [dispatch]),
      ...sliceState,
      isLoading: sliceState.isLoading || isStudyListLoading,
    };

    const hasParams = !!params;
    useEffect(() => {
      if (hasParams && typeof params.fetchArgs !== 'boolean') {
        dispatch(fetchThunk(params.fetchArgs));
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispatch, hasParams, params?.fetchArgs]);

    return hookResult;
  };

  return {
    name: options.name,
    reducer: slice.reducer,
    stateSelector: sliceStateSelector,
    hook,
    actions: {
      reset: slice.actions.reset,
      fetch: fetchThunk,
      refetch: refetchThunk,
    },
  };
}

export default createDataSlice;
