# Java RQM Client Implementation Analysis

## Overview
Analysis of the RQM_Query-1.0.3 Java client to guide the TypeScript/Node.js implementation.

## Authentication Flow

### 1. Initial Setup (RationalClient.java)
```java
BasicCredentialsProvider credentialsProvider = new BasicCredentialsProvider();
UsernamePasswordCredentials credentials = new UsernamePasswordCredentials(user, password);
credentialsProvider.setCredentials(AuthScope.ANY, credentials);

CloseableHttpClient client = HttpClientBuilder.create()
    .setDefaultCredentialsProvider(credentialsProvider)
    .build();
```

### 2. Form-Based Authentication (on 401)
When a request returns 401, the client performs form-based authentication:
```java
POST /jts/j_security_check
Parameters:
  - j_username: <username>
  - j_password: <password>
```

This sets cookies that are automatically included in subsequent requests by HttpClient.

### 3. Retry Logic
- Retries up to 3 times on failure
- Exponential backoff: 1s, 2s, 3s
- On 401, triggers form-based authentication before retry

## Key API Patterns

### Service Discovery
1. **Root Services**: `GET /qm/rootservices`
   - Returns service provider catalog URL

2. **Service Provider Catalog**: `GET /qm/oslc_qm/catalog`
   - Returns services URL for the project

3. **Services URL**: `GET /qm/oslc_qm/contexts/{contextId}/services.xml`
   - Returns query capabilities for different resource types
   - Extract URLs for: TestSuite, TestCase, TestExecutionRecord

### Resource URLs Pattern
```
Base: {rootUrl}/qm/service/com.ibm.rqm.integration.service.IIntegrationService/resources/{contextId}

Resources:
- /testcase/urn:com.ibm.rqm:testcase:{id}
- /executionworkitem/urn:com.ibm.rqm:executionworkitem:{id}
- /executionresult/urn:com.ibm.rqm:executionresult:{id}
- /testplan/urn:com.ibm.rqm:testplan:{id}
- /testphase/urn:com.ibm.rqm:testphase:{id}
```

### Creating Execution Results

#### Step 1: Get Test Case
```
GET {queryBase}/testcase?oslc.where=oslc:shortId="{testCaseId}"
```

#### Step 2: Get Test Execution Records (TER)
```
GET {basePath}/executionworkitem?fields=feed/entry/content/executionworkitem/(*|testcase[@href='{testCaseUrl}'])
```
Filter by iteration and test plan to find the correct TER.

#### Step 3: Create Execution Result
```
POST {basePath}/executionresult/urn:com.ibm.rqm:executionresult
Content-Type: application/xml
Accept: application/xml

Body: ExecutionResult XML (see template)
```

**Response Handling:**
- 201 Created: New result created, Content-Location header contains ID
- 303 See Other: Result already exists, Content-Location header contains URL

### Execution Result XML Structure

Key fields:
- `title`: Test result title
- `creator`: Username
- `owner`: Username  
- `state`: `com.ibm.rqm.execution.common.state.{passed|failed|incomplete|...}`
- `machine`: Machine name where test ran
- `iterations`: Number of iterations (usually "1")
- `starttime`: ISO 8601 UTC timestamp
- `endtime`: ISO 8601 UTC timestamp
- `weight`: Test weight (usually "100")
- `testedby/tester`: Username
- `testscript`: Link to test script (optional)
- `testcase`: Link to test case (required)
- `executionworkitem`: Link to TER (required)
- `variables`: Test case variables
- `adapterId`: Adapter ID (for automated tests)
- `stepResults`: Array of step results

#### Step Result Structure
Each step contains:
- `stepIndex`: Step number
- `startTime`: ISO 8601 UTC timestamp
- `endTime`: ISO 8601 UTC timestamp
- `result`: `com.ibm.rqm.execution.common.state.{passed|failed|...}`
- `description`: Step description
- `stepType`: Usually "com.ibm.rqm.execution.common.elementtype.execution"
- `tester`: Username
- `stepAttachment`: Link to attachment (optional)
- `properties/property[@propertyName='javaLineNo']`: Line number in script

### Attachment Upload

```
POST {basePath}/attachment
Content-Type: multipart/form-data

Returns: Attachment URL to reference in step results
```

## Configuration Properties

From `rqmapp.properties`:
```properties
rqm_project=_VK-Zentral-Betrieb(CCM)
rqm_user=${IETM_USERNAME}
rqm_password=${IETM_PASSWORD}
rqm_root_url=https://jazz.net/sandbox01-jts
rqm_user_url=https://jazz.net/sandbox01-jts/jts/users/${IETM_USERNAME}
rqm_project_area_url=https://jazz.net/sandbox01-qm/process/project-areas/_VK-Zentral-Betrieb(CCM)

**Note:** Use environment variables for credentials. Never commit real credentials to version control.
rqm_default_adapter_id=_zuba0D2nEeqdasL-v4nDNg
rqm_default_remotescript_id=<not used in our case>
```

## HTTP Client Configuration

### Headers
- **GET requests**: `Accept: application/xml`
- **POST requests**: 
  - `Accept: application/xml`
  - `Content-Type: application/xml`

### Timeouts
- Connect timeout: 6000ms
- Connection request timeout: 6000ms
- Socket timeout: 6000ms

### SSL
- Trust all certificates (for sandbox/test environments)
- NoopHostnameVerifier

## Error Handling

### Status Codes
- **200 OK**: Success
- **201 Created**: Resource created
- **303 See Other**: Resource already exists (idempotent POST)
- **401 Unauthorized**: Trigger form-based authentication
- **400-499**: Client error, log and fail
- **500-599**: Server error, retry

### Retry Strategy
1. Check status code
2. If 401: Perform form-based auth
3. If other error: Log error message from response body
4. Wait (retry_count * 1000ms)
5. Retry (max 3 times)

## TypeScript Implementation Notes

### Authentication
Use `axios` with:
- Basic auth credentials
- Cookie jar (`tough-cookie` + `axios-cookiejar-support`)
- Interceptor for 401 handling and form-based auth
- Retry logic with `axios-retry`

### XML Handling
- Use `fast-xml-parser` for parsing
- Use template strings or XML builder for creating XML
- Load ExecutionResult template from resources

### Session Management
- Create axios instance with cookie jar
- Cookies automatically managed across requests
- Form-based auth sets JSESSIONID cookie

### Key Differences from OAuth
- No OAuth tokens or signatures
- Simpler: Basic Auth + form-based auth + cookies
- Session-based authentication
- Must maintain cookie jar throughout client lifetime

## Implementation Priority

1. **Authentication Module** (Basic + Form-based)
2. **Service Discovery** (Root services → Catalog → Services)
3. **Resource Queries** (Get test cases, TERs)
4. **Result Creation** (Build XML, POST, handle response)
5. **Attachment Upload** (Multipart form data)
6. **Error Handling & Retry** (Interceptors, retry logic)
7. **Logging** (Winston with appropriate levels)

## Testing Strategy

1. Test authentication flow
2. Test service discovery
3. Test getting test cases
4. Test getting TERs
5. Test creating execution results
6. Test with attachments
7. Test error scenarios (401, 404, 500)
8. Test retry logic