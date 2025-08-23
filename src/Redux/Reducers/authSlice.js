import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    name: "",
    email: "",
    profilePhoto: "",
    id: "",
    login: false,
}

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        login:(state, action)=>{
            state.name = action.payload.name;
            state.email = action.payload.email;
            state.profilePhoto = action.payload.profilePhoto ? action.payload.profilePhoto : action.payload.photo;
            state.id = action.payload.id;
            state.login = true;
        },
        logout:(state, action)=>{
            state.name = "";
            state.email = "";
            state.profilePhoto = "";
            state.id = "";
            state.login = false;
        }
    }
})

export const { login, logout } = authSlice.actions;
export default authSlice.reducer;