### Variables & Types
```reflow
let name = "text";           // String
let count = 42;              // Number  
let active = true;           // Boolean
let items = [1, 2, 3];       // Array
let user = {name: "John"};   // Object
let message = `Hello ${name}`; // Template literal
```

### Control Flow
```reflow
if (condition) {
    // code here
} else {
    // else code
}

for (let i = 0; i < 10; i = i + 1) {
    // loop code
}

switch (value) {
    case 1:
        // code
        break;
    default:
        // default code
}
```

### Functions
```reflow
function greet(name) {
    return "Hello " + name;
}
```

## Essential APIs

### AI & Vision
```reflow
// AI with structured output
let result = ai("prompt", {
    format: "json",
    schema: {type: "object", properties: {answer: {type: "string"}}},
});

let result = ai("what's the meaning of life");
// result.text contains the response as string

// Vision analysis
let analysis = vision(screenshot().image, "What's on screen?", {
    format: "json",
    schema: {type: "object", properties: {elements: {type: "array"}}}
});
```

### Element Location
```reflow
// Vision-based (recommended for automation)
let button = locator({instruction: "Click the Submit button"});
if (button.found) {
    click([button.x, button.y]);
}

// Accessibility-based with vision fallback
let field = locator({
    element: "role:textfield name=Email",
    pid: appPID,
    instruction: "Click email input field"
});
```

### Mouse & Keyboard
```reflow
click([100, 200]);               // Click at coordinates
doubleClick([150, 250]);         // Double click
rightClick([200, 300]);          // Right click
type("Hello World");             // Type text
press("return");                 // Press Enter key
press("c", ["command"]);         // Cmd+C (copy)
press("v", ["command", "shift"]); // Cmd+Shift+V (paste special)

// Text selection
selectCharacters("left", 5);     // Select 5 chars left
selectWords("right", 2);         // Select 2 words right
selectLines("up", 3);            // Select 3 lines up
selectAll();                     // Select all text

// Mouse movement and dragging
move([300, 400]);                // Move mouse
drag([50, 50], [150, 150]);      // Drag from point to point
scroll([300, 300], "down", 5);   // Scroll at coordinates
```

### Screenshots
```reflow
let screen = screenshot();        // Full screen
let appScreen = screenshot(pid);  // App only
// Returns: {image, originalWidth, originalHeight, resizedWidth, resizedHeight}
```

### Apps & Windows
```reflow
let app = open("Chrome");         // Launch app
// Returns: {pid, appName, isUIStable, wasAlreadyRunning}
openUrl("https://example.com");   // Open URL
```

### File Operations
```reflow
// Basic file I/O
writeFile("/path/to/file.txt", "content");
appendFile("/path/to/log.txt", "new line");
let exists = fileExists("/path/to/file");
deleteFile("/path/to/unwanted.txt");
copyFile("/source.txt", "/dest.txt");
moveFile("/old/path.txt", "/new/path.txt");

// Directory operations
let files = listDirectory("/directory");

// Path utilities
let fullPath = pathJoin("Users", "name", "file.txt");
let filename = pathBasename("/path/to/file.txt");  // "file.txt"
let dirname = pathDirname("/path/to/file.txt");    // "/path/to"

// JSON operations
let data = loadJSON("/config.json");
saveJSON(object, "/output.json", true); // pretty print
let parsed = parseJSON('{"key": "value"}');
let jsonStr = stringifyJSON({a: 1}, true);
```

### Clipboard
```reflow
// Text clipboard
writeClipboard("Hello World");
let text = readClipboard();
let hasText = hasClipboardText();

// File clipboard
writeClipboardFiles(["/path1", "/path2"]);
let files = getClipboardFiles();
let hasFiles = hasClipboardFiles();

// Image clipboard
writeClipboardImage(base64Image);
let types = getClipboardTypes();
clearClipboard();
```

### String Manipulation
```reflow
// Basic string functions (standalone functions, not methods)
let parts = split("hello world", " ");      // ["hello", "world"]
let joined = join(["A", "B", "C"], "-");    // "A-B-C"
let sub = substring("hello", 0, 3);         // "hel"
let trimmed = trim("  spaced  ");           // "spaced"
let lower = toLowerCase("HELLO");           // "hello"
let upper = toUpperCase("hello");           // "HELLO"

// Search functions
let index = indexOf("hello world", "world");     // 6
let hasPrefix = startsWith("hello", "hel");      // true
let hasSuffix = endsWith("hello", "lo");         // true
let contains = contains("hello world", "world"); // true

// Replace functions
let replaced = replace("hello world", "world", "universe");
let allReplaced = replaceAll("a,b,a,c", "a", "x"); // "x,b,x,c"

// Regex functions
let matches = match("abc123", "\\d+");           // ["123"]
let hasDigits = test("abc123", "\\d+");          // true
let regexReplace = replaceRegex("abc123", "\\d+", "XXX"); // "abcXXX"
```

### Math & Utility Functions
```reflow
// Math functions
let absolute = abs(-5);          // 5
let squareRoot = sqrt(16);       // 4
let power = pow(2, 3);           // 8

// Type and data functions
let arrayLen = length([1,2,3]);  // 3
let stringLen = length("hello"); // 5
let dataType = typeof(42);       // "number"
let integer = parseInt("42.7");  // 42
let float = parseFloat("42.7");  // 42.7

// Date and time
let currentTime = now();         // Current timestamp in milliseconds
let readable = humanDate();      // "just now"
let formatted = humanDate(Date.now(), "es_ES"); // Spanish format
```

### Document Processing
```reflow
// Read and convert multiple files to markdown (max 10 files)
let documents = fileReader([
    "/path/to/invoice.pdf",
    "/path/to/report.docx", 
    "/path/to/data.json"
]);

// Access individual file content
let firstFile = documents.results[0];
let fileName = firstFile.name;        // "invoice.pdf"
let content = firstFile.data;         // Markdown-formatted content
let tokenCount = firstFile.tokens;    // Token count
```

### Timing
```reflow
wait(2);                         // Wait 2 seconds
wait(0.5);                       // Wait 500ms
```

## Common Patterns

### Browser Navigation
```reflow
let chrome = open("Google Chrome");
wait(1);
press("t", ["command"]);         // New tab
type("example.com");
press("return");
wait(3);                         // Wait for page load
```

### Form Filling
```reflow
let nameField = locator({instruction: "Click name input"});
if (nameField.found) {
    click([nameField.x, nameField.y]);
    type("John Doe");
}
```

### Verification with Vision
```reflow
let before = screenshot();
click([submitButton.x, submitButton.y]);
wait(2);
let after = screenshot();

let verified = vision([before.image, after.image], 
    "Did the form submit successfully?", {
    format: "json",
    schema: {type: "object", properties: {success: {type: "boolean"}}}
});
```

### AI-Powered Selection
```reflow
let screen = screenshot();
let options = vision(screen.image, "List all clickable buttons", {
    format: "json",
    schema: {
        type: "object",
        properties: {
            buttons: {
                type: "array",
                items: {
                    type: "object", 
                    properties: {
                        text: {type: "string"},
                        x: {type: "number"},
                        y: {type: "number"}
                    }
                }
            }
        }
    }
});

// Select and click first button
if (options.buttons && options.buttons.length > 0) {
    let firstButton = options.buttons[0];
    click([firstButton.x, firstButton.y]);
}
```

### Error Handling
```reflow
try {
    let result = riskyOperation();
} catch (error) {
    log("Error:", error);
} finally {
    // cleanup
}
```

## Key Differences from JavaScript

### ⚠️ Array Mutations - Important Difference!
```reflow
// ❌ WRONG - Arrays are immutable, push doesn't modify original
let items = [1, 2, 3];
items.push(4);  // This doesn't modify 'items'!

// ✅ CORRECT - Must reassign the result
let items = [1, 2, 3];
items = items.push(4);  // Now 'items' contains [1, 2, 3, 4]

// This applies to all array operations that would mutate in JavaScript
let arr = [1, 2, 3];
arr = arr.push(4);        // Add element
arr = arr.concat([5, 6]); // Concatenate arrays
```

### ❌ Not Supported
```javascript
// Variable declarations
const CONSTANT = "no";          // ❌ Use let instead
var oldStyle = "no";            // ❌ Use let instead

// Modern JS features  
async function fetch() {}       // ❌ No async/await
class Person {}                 // ❌ No classes
let {name} = user;              // ❌ No destructuring
items.map(x => x * 2);          // ❌ No array methods
let fn = x => x * 2;            // ❌ No implicit return arrows
let spread = [...array];        // ❌ No spread operator

// DOM/Browser APIs
document.getElementById("id");   // ❌ No DOM
console.log("message");         // ❌ Use log() instead
setTimeout(() => {}, 1000);     // ❌ Use wait() instead
fetch("url");                   // ❌ Use ai() instead
```

- ⚠️ **CRITICAL: Function Declaration Order** - Functions must be declared before they are used. Reflow executes sequentially from top to bottom, unlike JavaScript hoisting.