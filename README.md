# Shopping Basket 🛒 (React + Go + SQLite)

A simple full-stack **Shopping Cart / Basket** app:

- ✅ User signup & login (token based auth)
- ✅ Browse items
- ✅ Add/remove items in your cart
- ✅ Checkout (creates an order)
- ✅ View **your** order history (per user)

Live Frontend (Netlify): https://flourishing-flan-d0885b.netlify.app/  
Live Backend (Render): https://shopping-basket-5czp.onrender.com

---

## Tech Stack

### Frontend
- React
- Axios

### Backend
- Go (Gin)
- GORM
- SQLite (local file DB)

---

## Project Structure
shopping-basket/
backend/ -> Go (Gin) API
frontend/ -> React UI

---

## API Endpoints

### Auth
- `POST /users` → signup
- `POST /users/login` → login (returns token)

### Items
- `GET /items` → list items

### Cart (requires token)
- `GET /carts/me` → get my cart
- `POST /carts` → add items to cart
- `DELETE /carts/items/:itemId` → remove item from cart

### Orders (requires token)
- `POST /orders` → checkout
- `GET /orders/me` → my order history

> Note: Orders are **per user** (token required).

---

## Run Locally


