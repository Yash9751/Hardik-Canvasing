# Curl Commands for Adding Transport and Tanker Number Fields

## Prerequisites
- Replace `YOUR_RAILWAY_URL` with your actual Railway backend URL
- Example: `https://your-app-name.railway.app`

## 1. Execute SQL Script to Add Fields

First, you need to execute the SQL script to add the transport and tanker number fields. You can do this by:

1. Access your Railway PostgreSQL database directly
2. Run the contents of `add_transport_fields.sql`

Or use a database management tool to execute the SQL.

## 2. Add Default Transport Options

```bash
# Add Road Transport
curl -X POST https://YOUR_RAILWAY_URL/api/transports \
  -H "Content-Type: application/json" \
  -d '{"transport_name": "Road Transport"}'

# Add Rail Transport
curl -X POST https://YOUR_RAILWAY_URL/api/transports \
  -H "Content-Type: application/json" \
  -d '{"transport_name": "Rail Transport"}'

# Add Pipeline
curl -X POST https://YOUR_RAILWAY_URL/api/transports \
  -H "Content-Type: application/json" \
  -d '{"transport_name": "Pipeline"}'

# Add Ship/Vessel
curl -X POST https://YOUR_RAILWAY_URL/api/transports \
  -H "Content-Type: application/json" \
  -d '{"transport_name": "Ship/Vessel"}'
```

## 3. Test Transport API

```bash
# Get all transports
curl -X GET https://YOUR_RAILWAY_URL/api/transports

# Get transport by ID (replace 1 with actual ID)
curl -X GET https://YOUR_RAILWAY_URL/api/transports/1
```

## 4. Test Loading API with New Fields

```bash
# Create a loading entry with transport and tanker number
curl -X POST https://YOUR_RAILWAY_URL/api/loading \
  -H "Content-Type: application/json" \
  -d '{
    "sauda_id": 1,
    "loading_date": "2025-01-25",
    "vajan_kg": 1000.00,
    "note": "Test loading with transport",
    "transport_id": 1,
    "tanker_number": "TN-12345"
  }'

# Get all loading entries (should now include transport_name)
curl -X GET https://YOUR_RAILWAY_URL/api/loading

# Get loading by ID (replace 1 with actual ID)
curl -X GET https://YOUR_RAILWAY_URL/api/loading/1
```

## 5. Update Existing Loading Entry

```bash
# Update loading entry with transport and tanker number (replace 1 with actual ID)
curl -X PUT https://YOUR_RAILWAY_URL/api/loading/1 \
  -H "Content-Type: application/json" \
  -d '{
    "sauda_id": 1,
    "loading_date": "2025-01-25",
    "vajan_kg": 1000.00,
    "note": "Updated loading with transport",
    "transport_id": 2,
    "tanker_number": "TN-67890"
  }'
```

## 6. Add Custom Transport Options

```bash
# Add custom transport option
curl -X POST https://YOUR_RAILWAY_URL/api/transports \
  -H "Content-Type: application/json" \
  -d '{"transport_name": "Air Freight"}'

# Add another custom transport
curl -X POST https://YOUR_RAILWAY_URL/api/transports \
  -H "Content-Type: application/json" \
  -d '{"transport_name": "Container Transport"}'
```

## 7. Delete Transport (if needed)

```bash
# Delete transport by ID (replace 1 with actual ID)
curl -X DELETE https://YOUR_RAILWAY_URL/api/transports/1
```

## Notes

1. **Database Schema**: The SQL script creates a `transports` table and adds `transport_id` and `tanker_number` columns to the `loading` table.

2. **Optional Fields**: Both `transport_id` and `tanker_number` are optional fields, so existing loading entries will continue to work.

3. **Frontend Integration**: After implementing these backend changes, you'll need to update your frontend forms to include:
   - Transport dropdown (populated from `/api/transports`)
   - Tanker number text field

4. **Data Migration**: Existing loading entries will have `NULL` values for the new fields, which is acceptable.

## Verification

After running these commands, you should be able to:
- Create loading entries with transport and tanker number
- Retrieve loading entries that include transport information
- Manage transport options through the API 