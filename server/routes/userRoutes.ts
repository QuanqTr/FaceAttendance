import { Express } from "express";
import { ensureAuthenticated, ensureAdmin } from "../middlewares/auth";
import {
    getAllUsers,
    getAllAccounts,
    getUser,
    createUser,
    updateUser,
    updateUserPassword,
    deleteUser,
    getUserFaceProfile,
    updateUserFaceProfile,
    deleteUserFaceProfile
} from "../controllers/userController";

export function userRoutes(app: Express) {
    // User endpoints

    // Get all users
    app.get("/api/users", ensureAuthenticated, getAllUsers);

    // Get all accounts (alias for users)
    app.get("/api/accounts", ensureAuthenticated, getAllAccounts);

    // Get user by ID
    app.get("/api/users/:id", ensureAuthenticated, getUser);

    // Create new user
    app.post("/api/users", ensureAuthenticated, createUser);

    // Update user
    app.put("/api/users/:id", ensureAuthenticated, updateUser);

    // Update user password
    app.put("/api/users/:id/password", ensureAuthenticated, updateUserPassword);
    app.patch("/api/users/:id/password", ensureAuthenticated, updateUserPassword);

    // Delete user
    app.delete("/api/users/:id", ensureAuthenticated, deleteUser);

    // Face profile endpoints
    app.get("/api/users/:id/face-profile", ensureAuthenticated, getUserFaceProfile);
    app.post("/api/users/:id/face-profile", ensureAuthenticated, updateUserFaceProfile);
    app.delete("/api/users/:id/face-profile", ensureAuthenticated, deleteUserFaceProfile);
} 