import {configureStore} from '@reduxjs/toolkit';
import authReducer from '../Reducers/authSlice';
import api from '../apiRTK/api';

const store = configureStore({
    reducer: {
        auth : authReducer,
        [api.reducerPath]: api.reducer
        //createApi returns reducer, middleware and generated hooks
    },
    middleware: (mid) => [...mid(), api.middleware],
})

export default store;