# Order History APIs Documentation

This document outlines the APIs available for users to view their cafeteria and utilities order histories.

---

## 📋 Endpoints Overview

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/cafeteria/orders` | GET | User | Get cafeteria order history |
| `/api/utilities/order/my-orders` | GET | User | Get utility order history |
| `/api/user/order-history` | GET | User | Get combined order history (cafeteria + utilities) |

---

## 1. Cafeteria Order History

### Endpoint
```
GET /api/cafeteria/orders
```

### Authentication
- Required: Bearer Token (User)
- Header: `Authorization: Bearer <token>`

### Query Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number for pagination |
| `limit` | number | 10 | Number of records per page |
| `status` | string | - | Filter by status (Pending, Confirmed, Delivered, Cancelled) |
| `fromDate` | string | - | Filter from date (ISO format: YYYY-MM-DD) |
| `toDate` | string | - | Filter to date (ISO format: YYYY-MM-DD) |

### Example Request
```bash
curl -X GET "http://localhost:3000/api/cafeteria/orders?page=1&limit=10&status=Pending" \
  -H "Authorization: Bearer your_token_here"
```

### Example Response (Success)
```json
{
  "success": true,
  "message": "User cafeteria orders fetched successfully",
  "data": {
    "orders": [
      {
        "id": 1,
        "userId": 5,
        "itemName": "Cappuccino",
        "quantity": 2,
        "price": "30.00",
        "totalAmount": "60.00",
        "status": "Pending",
        "paid": "Pending",
        "specialInstructions": "Extra hot",
        "paymentScreenshot": "/uploads/cafeteria/screenshot.jpg",
        "utrNumber": "123456789",
        "isPersonal": false,
        "isMonthlyPayment": false,
        "kycId": null,
        "spaceId": 3,
        "createdAt": "2025-05-01T10:30:00Z",
        "updatedAt": "2025-05-01T10:30:00Z",
        "space": {
          "id": 3,
          "spaceName": "Cabin A",
          "cabinNumber": "101",
          "roomNumber": null,
          "seater": 2
        },
        "kyc": null
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalOrders": 45,
      "limit": 10
    }
  }
}
```

### Status Codes
- `200 OK` - Orders fetched successfully
- `400 Bad Request` - Invalid parameters
- `401 Unauthorized` - Invalid or missing token
- `500 Internal Server Error` - Server error

---

## 2. Utility Order History

### Endpoint
```
GET /api/utilities/order/my-orders
```

### Authentication
- Required: Bearer Token (User)
- Header: `Authorization: Bearer <token>`

### Query Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number for pagination |
| `limit` | number | 10 | Number of records per page |
| `status` | string | - | Filter by status (Pending, Confirmed, Delivered, Cancelled) |
| `fromDate` | string | - | Filter from date (ISO format: YYYY-MM-DD) |
| `toDate` | string | - | Filter to date (ISO format: YYYY-MM-DD) |

### Example Request
```bash
curl -X GET "http://localhost:3000/api/utilities/order/my-orders?page=1&limit=10" \
  -H "Authorization: Bearer your_token_here"
```

### Example Response (Success)
```json
{
  "success": true,
  "message": "User utility orders fetched successfully",
  "data": {
    "orders": [
      {
        "id": 1,
        "userId": 5,
        "utilityId": 2,
        "quantity": 1,
        "price": "150.00",
        "totalAmount": "150.00",
        "status": "Delivered",
        "paid": "Completed",
        "specialInstructions": "Deliver in morning",
        "paymentScreenshot": "/uploads/utility-orders/screenshot.jpg",
        "utrNumber": "987654321",
        "printFile": null,
        "createdAt": "2025-04-28T09:15:00Z",
        "updatedAt": "2025-04-29T14:30:00Z",
        "utility": {
          "id": 2,
          "name": "Whiteboard Markers",
          "category": "Stationery",
          "price": "150.00"
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalOrders": 28,
      "limit": 10
    }
  }
}
```

### Status Codes
- `200 OK` - Orders fetched successfully
- `400 Bad Request` - Invalid parameters
- `401 Unauthorized` - Invalid or missing token
- `500 Internal Server Error` - Server error

---

## 3. Combined Order History (NEW)

### Endpoint
```
GET /api/user/order-history
```

### Authentication
- Required: Bearer Token (User)
- Header: `Authorization: Bearer <token>`

### Query Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number for pagination |
| `limit` | number | 15 | Number of records per page |
| `type` | string | "all" | Filter by type: "all", "cafeteria", or "utility" |
| `status` | string | - | Filter by status (Pending, Confirmed, Delivered, Cancelled) |
| `fromDate` | string | - | Filter from date (ISO format: YYYY-MM-DD) |
| `toDate` | string | - | Filter to date (ISO format: YYYY-MM-DD) |

### Example Requests

#### Get all orders (cafeteria + utilities)
```bash
curl -X GET "http://localhost:3000/api/user/order-history?page=1&limit=15" \
  -H "Authorization: Bearer your_token_here"
```

#### Get only cafeteria orders
```bash
curl -X GET "http://localhost:3000/api/user/order-history?type=cafeteria" \
  -H "Authorization: Bearer your_token_here"
```

#### Get only utility orders
```bash
curl -X GET "http://localhost:3000/api/user/order-history?type=utility" \
  -H "Authorization: Bearer your_token_here"
```

#### Get orders within a date range
```bash
curl -X GET "http://localhost:3000/api/user/order-history?fromDate=2025-04-01&toDate=2025-05-01" \
  -H "Authorization: Bearer your_token_here"
```

#### Get pending orders
```bash
curl -X GET "http://localhost:3000/api/user/order-history?status=Pending" \
  -H "Authorization: Bearer your_token_here"
```

### Example Response (Success)
```json
{
  "success": true,
  "message": "Order history fetched successfully",
  "data": {
    "orders": [
      {
        "id": 1,
        "type": "cafeteria",
        "itemName": "Cappuccino",
        "quantity": 2,
        "unitPrice": "30.00",
        "totalAmount": "60.00",
        "status": "Pending",
        "paymentStatus": "Pending",
        "specialInstructions": "Extra hot",
        "location": "Cabin A (101)",
        "createdAt": "2025-05-01T10:30:00Z"
      },
      {
        "id": 2,
        "type": "utility",
        "itemName": "Whiteboard Markers",
        "category": "Stationery",
        "quantity": 1,
        "unitPrice": "150.00",
        "totalAmount": "150.00",
        "status": "Delivered",
        "paymentStatus": "Completed",
        "specialInstructions": null,
        "createdAt": "2025-04-28T09:15:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 2,
      "totalOrders": 28,
      "limit": 15
    },
    "summary": {
      "totalCafeteriaOrders": 15,
      "totalUtilityOrders": 13,
      "totalSpent": 3450.50
    }
  }
}
```

### Status Codes
- `200 OK` - Order history fetched successfully
- `400 Bad Request` - Invalid parameters
- `401 Unauthorized` - Invalid or missing token
- `500 Internal Server Error` - Server error

---

## 🔍 Filtering Examples

### Example 1: Get pending cafeteria orders from last 7 days
```bash
curl -X GET "http://localhost:3000/api/cafeteria/orders?status=Pending&fromDate=2025-04-24&toDate=2025-05-01&page=1&limit=20" \
  -H "Authorization: Bearer your_token_here"
```

### Example 2: Get all delivered orders
```bash
curl -X GET "http://localhost:3000/api/user/order-history?status=Delivered&limit=50" \
  -H "Authorization: Bearer your_token_here"
```

### Example 3: Get utility orders with pagination
```bash
curl -X GET "http://localhost:3000/api/utilities/order/my-orders?page=2&limit=25" \
  -H "Authorization: Bearer your_token_here"
```

---

## 📊 Order Status Values

- `Pending` - Order placed but not confirmed
- `Confirmed` - Order confirmed by admin
- `Delivered` - Order delivered to user
- `Cancelled` - Order cancelled

## 💳 Payment Status Values

- `Pending` - Payment awaiting
- `Completed` - Payment completed
- `Failed` - Payment failed

---

## ⚙️ Implementation Details

### Enhanced Features

1. **Pagination** - All endpoints support page-based pagination
2. **Filtering** - Filter by status and date range
3. **Sorting** - Results are sorted by creation date (most recent first)
4. **Unified View** - Combined endpoint aggregates both order types
5. **Summary Stats** - Combined endpoint provides total spent and order counts

### Response Structure

All successful responses follow this structure:
```json
{
  "success": true,
  "message": "Description",
  "data": {
    "orders": [],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalOrders": 0,
      "limit": 10
    }
  }
}
```

---

## 🔒 Security Notes

- All endpoints require valid Bearer token authentication
- Users can only view their own orders (userId enforced server-side)
- Tokens expire based on your authentication configuration
- Always include Authorization header with valid token

---

## 🚀 Usage in Frontend

### React Example
```javascript
// Get cafeteria order history
const fetchCafeteriaOrders = async (token, page = 1, status = '') => {
  const url = new URL('http://localhost:3000/api/cafeteria/orders');
  url.searchParams.append('page', page);
  url.searchParams.append('limit', 10);
  if (status) url.searchParams.append('status', status);
  
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};

// Get combined order history
const fetchOrderHistory = async (token, type = 'all', page = 1) => {
  const url = new URL('http://localhost:3000/api/user/order-history');
  url.searchParams.append('type', type);
  url.searchParams.append('page', page);
  url.searchParams.append('limit', 15);
  
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};
```

---

## 📝 Notes

- Date parameters should be in ISO format (YYYY-MM-DD)
- Default page size varies by endpoint (10 for specific orders, 15 for combined)
- Pagination is 1-indexed (first page is 1, not 0)
- All monetary values are in decimal format (e.g., "150.00")
- Timestamps are in ISO 8601 format with timezone (UTC)

