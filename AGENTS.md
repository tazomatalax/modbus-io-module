# Modbus IO Module - Agent Guidelines

This document outlines key guidelines and requirements for AI coding agents working on this project.

## Core Requirements

### Simulator Testing Requirement
**CRITICAL:** Any agent implementing a new feature with web UI components MUST ensure the feature can be tested in the simulator.

When implementing new API endpoints or web interface features:

1. **Check Simulator Compatibility**: Before considering a feature complete, verify that all required endpoints exist in `simulator/server.js`
2. **Add Missing Endpoints**: If the feature requires new HTTP API endpoints, implement mock versions in the simulator
3. **Test in Simulator**: Verify the complete feature works in the simulator environment
4. **Document API Changes**: Update the simulator's API documentation comment at the top of `server.js`

#### Example
If you implement a new feature that adds `/sensors/config` endpoints to `src/main.cpp`, you MUST also add corresponding mock endpoints to `simulator/server.js`:

```javascript
app.get('/sensors/config', (req, res) => {
  // Mock implementation for testing
  res.json({ sensors: [] });
});

app.post('/sensors/config', (req, res) => {
  // Mock implementation for testing
  res.json({ success: true });
});
```

### Why This Matters
- The simulator allows rapid development and testing without hardware
- UI features that can't be tested in the simulator create development friction
- Mock endpoints help identify API design issues early
- Consistent simulator behavior improves developer experience

## Project Structure

### Key Components
- `src/main.cpp` - Arduino firmware with ESP32 web server
- `data/` - Web UI files (HTML, CSS, JS)
- `simulator/server.js` - Node.js development server with API mocks
- `include/` - C++ headers and system definitions

### Development Flow
1. Implement firmware endpoints in `src/main.cpp`
2. Create/update web UI in `data/`
3. **Add corresponding simulator endpoints** in `simulator/server.js`
4. Test complete feature in simulator
5. Commit and close issues

## Testing Requirements

### Before Marking Features Complete
- [ ] Feature works on actual hardware (if available)
- [ ] **Feature works in simulator environment**
- [ ] All new API endpoints have simulator mocks
- [ ] Web UI properly handles both success and error cases
- [ ] No console errors in browser developer tools

### Simulator Commands
```bash
# Start simulator
cd simulator
npm install  # First time only
npm start    # Starts on http://localhost:8080

# Or with nodemon for auto-restart
npm run dev
```

## Code Style

### API Endpoints
- Use consistent REST patterns
- Include proper error handling
- Add descriptive console logging
- Handle both success and failure scenarios

### Web UI
- Follow existing component patterns
- Use consistent CSS classes
- Implement proper form validation
- Show user feedback (toasts, loading states)

## Common Pitfalls to Avoid

1. **Forgetting Simulator Support**: Implementing firmware endpoints without simulator mocks
2. **Incomplete Error Handling**: Not testing failure scenarios
3. **Missing Validation**: Frontend accepting invalid data
4. **Poor User Feedback**: No indication when operations succeed/fail
5. **Inconsistent Patterns**: Not following existing code conventions

## Questions?

If you encounter issues or need clarification on these guidelines, check:
- Recent commit messages for patterns
- Existing API endpoints in both firmware and simulator
- Web UI components for styling and behavior patterns