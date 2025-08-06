import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    name: "",
    email: "",
    profilePhoto: "",
    login: false,
}

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        login:(state, action)=>{
            state.name = action.payload.name;
            state.email = action.payload.email;
            state.profilePhoto = action.payload.profilePhoto;
            state.login = true;
        },
        logout:(state, action)=>{
            state.name = "";
            state.email = "";
            state.profilePhoto = "";
            state.login = false;
        }
    }
})

export const { login, logout } = authSlice.actions;
export default authSlice.reducer;