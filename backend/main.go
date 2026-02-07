package main

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type User struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Username  string    `gorm:"uniqueIndex;not null" json:"username"`
	Password  string    `gorm:"not null" json:"-"`
	Token     string    `gorm:"index" json:"-"`
	CreatedAt time.Time `json:"created_at"`
}

type Item struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"not null" json:"name"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}

type Cart struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"uniqueIndex;not null" json:"user_id"`
	Name      string    `json:"name"`
	Status    string    `gorm:"not null" json:"status"`
	CreatedAt time.Time `json:"created_at"`
}

type CartItem struct {
	ID     uint `gorm:"primaryKey" json:"id"`
	CartID uint `gorm:"index;not null" json:"cart_id"`
	ItemID uint `gorm:"index;not null" json:"item_id"`
}

type Order struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	CartID    uint      `gorm:"index;not null" json:"cart_id"`
	UserID    uint      `gorm:"index;not null" json:"user_id"`
	CreatedAt time.Time `json:"created_at"`
}

type CartWithItems struct {
	Cart      Cart       `json:"cart"`
	CartItems []CartItem `json:"cart_items"`
}

type OrderItemDTO struct {
	ItemID uint   `json:"item_id"`
	Name   string `json:"name"`
	Qty    int    `json:"qty"`
}

type OrderDTO struct {
	ID        uint           `json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	Status    string         `json:"status"`
	Items     []OrderItemDTO `json:"items"`
}

var db *gorm.DB

func initDB() {
	database, err := gorm.Open(sqlite.Open("shopping.db"), &gorm.Config{})
	if err != nil {
		panic(err)
	}
	db = database

	if err := db.AutoMigrate(&User{}, &Item{}, &Cart{}, &CartItem{}, &Order{}); err != nil {
		panic(err)
	}

	var count int64
	db.Model(&Item{}).Count(&count)
	if count == 0 {
		db.Create(&Item{Name: "Apple", Status: "ACTIVE"})
		db.Create(&Item{Name: "Milk", Status: "ACTIVE"})
		db.Create(&Item{Name: "Bread", Status: "ACTIVE"})
		db.Create(&Item{Name: "Eggs", Status: "ACTIVE"})
		db.Create(&Item{Name: "Rice", Status: "ACTIVE"})
	}
}

// ---------------- Middleware ----------------

func corsMiddleware() gin.HandlerFunc {
	allowedOrigins := map[string]bool{
		"http://localhost:3000":                       true,
		"https://flourishing-flan-d0885b.netlify.app": true, // ✅ Netlify URL (no trailing slash)
	}

	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		if allowedOrigins[origin] {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Vary", "Origin")
			c.Header("Access-Control-Allow-Credentials", "true")
		}

		c.Header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Authorization, Content-Type, Origin, Accept")

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

func authMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		auth := c.GetHeader("Authorization")
		if auth == "" || !strings.HasPrefix(auth, "Bearer ") {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "missing token"})
			c.Abort()
			return
		}

		token := strings.TrimSpace(strings.TrimPrefix(auth, "Bearer "))
		var user User
		if err := db.Where("token = ?", token).First(&user).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			c.Abort()
			return
		}

		c.Set("user", user)
		c.Next()
	}
}

// ---------------- Handlers ----------------

func postUsers(c *gin.Context) {
	var body struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	body.Username = strings.TrimSpace(body.Username)
	body.Password = strings.TrimSpace(body.Password)

	if body.Username == "" || body.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "username and password required"})
		return
	}

	hash, _ := bcrypt.GenerateFromPassword([]byte(body.Password), bcrypt.DefaultCost)
	user := User{Username: body.Username, Password: string(hash)}

	if err := db.Create(&user).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "username already exists"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"id": user.ID, "username": user.Username, "created_at": user.CreatedAt})
}

func getUsers(c *gin.Context) {
	var users []User
	db.Find(&users)
	c.JSON(http.StatusOK, users)
}

func postLogin(c *gin.Context) {
	var body struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	body.Username = strings.TrimSpace(body.Username)
	body.Password = strings.TrimSpace(body.Password)

	var user User
	if err := db.Where("username = ?", body.Username).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid username/password"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(body.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid username/password"})
		return
	}

	token := uuid.NewString()
	db.Model(&user).Update("token", token)

	c.JSON(http.StatusOK, gin.H{"token": token})
}

func postItems(c *gin.Context) {
	var body struct {
		Name   string `json:"name"`
		Status string `json:"status"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	body.Name = strings.TrimSpace(body.Name)
	body.Status = strings.TrimSpace(body.Status)

	if body.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name required"})
		return
	}
	if body.Status == "" {
		body.Status = "ACTIVE"
	}

	item := Item{Name: body.Name, Status: body.Status}
	db.Create(&item)
	c.JSON(http.StatusCreated, item)
}

func getItems(c *gin.Context) {
	var items []Item
	db.Find(&items)
	c.JSON(http.StatusOK, items)
}

func ensureActiveCart(userID uint) (Cart, error) {
	var cart Cart
	err := db.Where("user_id = ?", userID).First(&cart).Error

	if err == nil {
		if cart.Status == "ORDERED" {
			cart.Status = "ACTIVE"
			cart.Name = ""
			db.Save(&cart)
			db.Where("cart_id = ?", cart.ID).Delete(&CartItem{})
		}
		return cart, nil
	}

	cart = Cart{UserID: userID, Status: "ACTIVE"}
	if err := db.Create(&cart).Error; err != nil {
		return Cart{}, err
	}
	return cart, nil
}

func postCarts(c *gin.Context) {
	u := c.MustGet("user").(User)

	var body struct {
		ItemID  uint   `json:"itemId"`
		ItemIDs []uint `json:"itemIds"`
	}

	if err := c.ShouldBindJSON(&body); err != nil || (body.ItemID == 0 && len(body.ItemIDs) == 0) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "itemId or itemIds required"})
		return
	}

	cart, err := ensureActiveCart(u.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create cart"})
		return
	}

	ids := body.ItemIDs
	if body.ItemID != 0 {
		ids = append(ids, body.ItemID)
	}

	for _, id := range ids {
		var item Item
		if err := db.First(&item, id).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid item id"})
			return
		}

		var existing CartItem
		err := db.Where("cart_id = ? AND item_id = ?", cart.ID, id).First(&existing).Error
		if err != nil {
			db.Create(&CartItem{CartID: cart.ID, ItemID: id})
		}
	}

	var cartItems []CartItem
	db.Where("cart_id = ?", cart.ID).Find(&cartItems)
	c.JSON(http.StatusOK, CartWithItems{Cart: cart, CartItems: cartItems})
}

func getCarts(c *gin.Context) {
	var carts []Cart
	db.Find(&carts)
	c.JSON(http.StatusOK, carts)
}

func getMyCart(c *gin.Context) {
	u := c.MustGet("user").(User)

	cart, err := ensureActiveCart(u.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not get cart"})
		return
	}

	var cartItems []CartItem
	db.Where("cart_id = ?", cart.ID).Find(&cartItems)
	c.JSON(http.StatusOK, CartWithItems{Cart: cart, CartItems: cartItems})
}

func postOrders(c *gin.Context) {
	u := c.MustGet("user").(User)

	var body struct {
		CartID uint `json:"cartId"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.CartID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cartId required"})
		return
	}

	var cart Cart
	if err := db.First(&cart, body.CartID).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cart not found"})
		return
	}
	if cart.UserID != u.ID {
		c.JSON(http.StatusForbidden, gin.H{"error": "not your cart"})
		return
	}
	if cart.Status == "ORDERED" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cart already ordered"})
		return
	}

	var count int64
	db.Model(&CartItem{}).Where("cart_id = ?", cart.ID).Count(&count)
	if count == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cart is empty"})
		return
	}

	order := Order{CartID: cart.ID, UserID: u.ID}
	db.Create(&order)
	db.Model(&cart).Update("status", "ORDERED")

	c.JSON(http.StatusCreated, gin.H{"orderId": order.ID})
}

// ✅ FIXED: /orders should NOT be public.
// This returns only logged-in user's raw orders list.
func getOrders(c *gin.Context) {
	u := c.MustGet("user").(User)

	var orders []Order
	db.Where("user_id = ?", u.ID).Order("id desc").Find(&orders)
	c.JSON(http.StatusOK, orders)
}

// ✅ This returns my orders with item names + qty (DTO)
func getMyOrders(c *gin.Context) {
	u := c.MustGet("user").(User)

	var orders []Order
	db.Where("user_id = ?", u.ID).Order("id desc").Find(&orders)

	result := make([]OrderDTO, 0, len(orders))

	for _, o := range orders {
		var cartItems []CartItem
		db.Where("cart_id = ?", o.CartID).Find(&cartItems)

		qtyMap := map[uint]int{}
		for _, ci := range cartItems {
			qtyMap[ci.ItemID]++
		}

		items := make([]OrderItemDTO, 0, len(qtyMap))
		for itemID, qty := range qtyMap {
			var it Item
			name := "Unknown"
			if err := db.First(&it, itemID).Error; err == nil {
				name = it.Name
			}
			items = append(items, OrderItemDTO{ItemID: itemID, Name: name, Qty: qty})
		}

		result = append(result, OrderDTO{
			ID:        o.ID,
			CreatedAt: o.CreatedAt,
			Status:    "PLACED",
			Items:     items,
		})
	}

	c.JSON(http.StatusOK, result)
}

func deleteCartItem(c *gin.Context) {
	u := c.MustGet("user").(User)

	itemID64, err := strconv.ParseUint(c.Param("itemId"), 10, 64)
	if err != nil || itemID64 == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid itemId"})
		return
	}
	itemID := uint(itemID64)

	var cart Cart
	if err := db.Where("user_id = ? AND status = ?", u.ID, "ACTIVE").First(&cart).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "no active cart"})
		return
	}

	var ci CartItem
	if err := db.Where("cart_id = ? AND item_id = ?", cart.ID, itemID).First(&ci).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "item not found in cart"})
		return
	}

	if err := db.Delete(&ci).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete"})
		return
	}

	var cartItems []CartItem
	db.Where("cart_id = ?", cart.ID).Find(&cartItems)
	c.JSON(http.StatusOK, CartWithItems{Cart: cart, CartItems: cartItems})
}

func main() {
	initDB()

	r := gin.Default()
	r.Use(corsMiddleware()) // ✅ MUST be before routes

	r.POST("/users", postUsers)
	r.GET("/users", getUsers)
	r.POST("/users/login", postLogin)

	r.POST("/items", postItems)
	r.GET("/items", getItems)

	r.POST("/carts", authMiddleware(), postCarts)
	r.GET("/carts", getCarts)
	r.GET("/carts/me", authMiddleware(), getMyCart)

	r.POST("/orders", authMiddleware(), postOrders)

	// ✅ IMPORTANT: protect /orders so it never shows global history
	r.GET("/orders", authMiddleware(), getOrders)
	r.GET("/orders/me", authMiddleware(), getMyOrders)

	r.DELETE("/carts/items/:itemId", authMiddleware(), deleteCartItem)

	r.Run(":8080")
}
