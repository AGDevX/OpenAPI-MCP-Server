# Friendly Tool Names & Descriptions

This MCP server automatically generates friendly, intuitive tool names and helpful descriptions from your OpenAPI specification.

## Features

### 🎯 Smart Name Generation

The server intelligently generates tool names using the following priority:

1. **Manual operationId** - If your OpenAPI spec has a well-named `operationId` (like `getUserProfile`), it's preserved and converted to snake_case
2. **Auto-generated names** - For specs without operationIds or with technical ones (like `post_api_v1_users`), friendly names are generated from the HTTP method and path

### 📝 Enhanced Descriptions

Descriptions are automatically enriched with:
- Summary from the OpenAPI spec (if available)
- Fallback to inferred action from HTTP method and path
- **Required parameters** clearly listed at the end

## Examples

### Before and After

#### Example 1: Creating a User
```
Before:  post_api_v1_users
After:   create_user
Description: "Create a new user. Requires: name, email, body."
```

#### Example 2: Listing Users
```
Before:  get_api_v1_users
After:   list_users
Description: "List users"
```

#### Example 3: Getting a Single User
```
Before:  get_api_v1_users_id
After:   get_user
Description: "Get a single user. Requires: id."
```

#### Example 4: Updating a User
```
Before:  put_api_v1_users_id
After:   update_user
Description: "Update a user. Requires: id, body."
```

#### Example 5: Deleting a User
```
Before:  delete_api_v1_users_id
After:   delete_user
Description: "Delete a user. Requires: id."
```

#### Example 6: Manual operationId Preserved
```
Before:  getUserProfile (manual operationId)
After:   get_user_profile
Description: "Get the current user profile"
```

## Smart POST Operation Handling

POST requests aren't always "create" operations! The server intelligently detects when POST is used for:

- **Search/Query** operations (need request body): `POST /users/search` → `search_user`
- **Actions** on resources: `POST /users/{id}/activate` → `activate_user`
- **Calculations/Validations**: `POST /calculate` → `calculate`
- **Other actions**: filter, export, process, validate, etc.

**Examples:**

| Path | Tool Name | Description |
|------|-----------|-------------|
| `POST /users` | `create_user` | Create a new user |
| `POST /users/search` | `search_user` | Search user |
| `POST /products/query` | `query_product` | Query product |
| `POST /items/filter` | `filter_item` | Filter item |
| `POST /calculate` | `calculate` | Calculate |
| `POST /validate` | `validate` | Validate |
| `POST /orders/process` | `process_order` | Process order |
| `POST /users/{id}/activate` | `activate_user` | Activate user |
| `POST /reports/export` | `export_report` | Export report |

The server recognizes **60+ common action words** including: search, query, filter, calculate, validate, process, activate, cancel, export, enroll, transfer, merge, certify, upsert, and many more.

## How It Works

### Name Generation Logic

1. **Detect if operationId is friendly**
   - Check if it's manually created (not `method_path` pattern)
   - If friendly: convert camelCase → snake_case
   - If auto-generated: generate from method + resource

2. **Extract resource from path**
   - `/api/v1/users/{id}` → `user`
   - `/api/v1/categories` → `category` (singularized)
   - `/api/v1/addresses/{id}` → `address` (singularized)

3. **Apply naming convention**
   - `GET /resource` → `list_resources`
   - `GET /resource/{id}` → `get_resource`
   - `POST /resource` → `create_resource`
   - `PUT /resource/{id}` → `update_resource`
   - `PATCH /resource/{id}` → `patch_resource`
   - `DELETE /resource/{id}` → `delete_resource`

### Description Enhancement

1. **Use OpenAPI summary** if available
2. **Fall back to description** (first line) if no summary
3. **Generate from method + path** if neither exists
4. **Append required parameters** for clarity

## Benefits

✅ **Better AI Understanding** - AI assistants can more easily understand what each tool does
✅ **Clearer Intent** - `create_user` is more intuitive than `post_api_v1_users`
✅ **Required Parameters** - Immediately know what inputs are needed
✅ **Consistent Naming** - All tools follow the same convention
✅ **Smart Singularization** - Handles common plural forms (users → user, categories → category, addresses → address)

## For API Authors

To get the best results:

1. **Add summaries** to your OpenAPI operations
   ```yaml
   /users:
     post:
       summary: "Create a new user account"
       operationId: createUser
   ```

2. **Use meaningful operationIds** (optional but recommended)
   ```yaml
   operationId: getUserProfile  # ✅ Good
   operationId: get_user_profile  # ✅ Also good
   operationId: operation123  # ❌ Will be auto-generated instead
   ```

3. **Mark required parameters** correctly
   ```yaml
   parameters:
     - name: id
       in: path
       required: true  # Shows in description
   ```

The server works great even without these - but they make the experience even better!
