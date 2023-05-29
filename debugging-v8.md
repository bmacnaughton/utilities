# Investigating and Debugging v8 using gdb

This came from an effort to 1) try to avoid the string copy when adding external data to a string and 2) try to maintain a string's tracking when the string is used as the key to an object. The research required a deep look into how v8 handles strings. This document captures some of the process and learnings in order to help any future investigations.

## Debugging v8 with gdb in general
While debugging one's own addon, can be done without building a debug version of node, stepping through v8 code really needs a debug version of node.

This effort worked with node v16.19.1, installed using nvm. It's important to document the version each time an investigation is done so that someone trying to reproduce any
findings will see the same modules and line numbers.

### Step 1: Clone the node repo
You can clone the node repo, then checkout the version you’ll be working on:

- `git clone git@github.com:nodejs/node`

- `git checkout v16.19.1`

Or, because it's really big, you can clone only the specific version you'll be working with:

- `git clone --depth 1 git@github.com:nodejs/node -b v16.19.1`

### Step 2: Build a debug version of node and set it up
Configure it for debug. This was important because I was getting "value optimized out" when trying to view variables in the debugger.:

- `./configure --v8-non-optimized-debug --debug --debug-node`

Make it:

- `make -j4` (or 6 or 8 - number of concurrent builds depends on CPU cores)

Copy it to the normal execution location (this presumes nvm is being used):

- `cp -a -f out/Debug/node $NVM_BIN/node-debug`

Copy gdbinit. It contains macros for easier inspection of v8 objects.

- `cp deps/v8/tools/gdbinit ~/.gdbinit`

Reference:

[Debug V8 in Node.js core with GDB](https://medium.com/fhinkel/debug-v8-in-node-js-core-with-gdb-cc753f1f32)

### Step 3: Run your own code
Of course, you'll want to compile your code for debugging as well.

`distringuish` uses `prebuildify`, which I found problematic for building a debug addon for debugging. It is another layer of abstraction and requires extra code to load the correct target.

To build the debug version of distringuish, I ended up using the straightforward command:

- `npx node-gyp build --debug`

Write a simple as possible JavaScript program that causes exercises the code you want debug. For example, if wanting to evaluate the `distringuish` function `GetProperties`, which is bound to the JavaScript function `getProperties`:

```
const d = require('node-gyp-build')(__dirname);
d.getProperties({ simple: 'test' });
```
Name that script `debug.js` and run it with gdb:

- `gdb --args $NVM_BIN/node-debug debug.js`

## A little extra help with gdbinit
When you copied deps/v8/tools/gdbinit to ~/.gdbinit, it made some useful commands available in gdb.

- `jh` displays the object behind a handle

- `jlh` displays the object behind a local handle

Looking at the macros in `gdbinit` is helpful for learning how to access data. For example, even when `string` is a `Handle<String>`, `p string->IsExternal()` doesn't work because `gdb` gets confused and reports "Too few arguments in function call".

But using a slight variation on the `jh` macro's syntax, an explicit cast to String, gets the desired result: `p ((v8::String*)string.location_)->IsExternal()`.

This approach works for most of the `v8::String` methods, though some, e.g. `IsOneByteRepresentation` work as `p string->IsOneByteRepresentation()` but not with explicit casting.

Note that `->` and `.` are the same when it comes to handles - `->` is overloaded for historical reasons. ([See V8's Object Model Using Well-defined C++.](https://docs.google.com/document/d/1_w49sakC1XM1OptjTurBDqO86NE16FH8LwbeUAtrbCo/edit#heading=h.8wg7tpqbpt7m))

## Generic gdb learnings
I had used gdb sparingly before this; this section is probably not very useful for anyone that has used `gdb` more than a little. But for completeness, I’m documenting things that I needed to learn.

gdb's `n` command works differently than I expected. It doesn't skip over function calls. The best way I found to go to a specific line was `tbreak line-number` (or relative, `tbreak +1`) followed by `continue` (`c`). Using a temporary breakpoint avoids cluttering up the code with many breakpoints.

The main reason for needing `tbreak` is that the C++ code has many macros and helper code (threading, access, etc.) that often obscure the flow of a single function.

`gdb` is not particularly good at displaying C++ objects. While `p/x` (print as hex) can often be used, examine, e.g., `x/2xg` (examine address for 2 giant words as hex - giant is 64 bit), is often more helpful.

Other useful commands are `bt` (the stack, backtrace), `ptype` (print type information for a variable), and `info breakpoints` and `delete breakpoint #`.

Setting conditional breakpoints in a multithreaded program (and node/v8 is multithreaded) is problematic. It’s easier just to edit the v8 code to check for a condition and execute a noop line when the condition is met; set a break on the noop line.

### While debugging
You'll want to the node repo opened in an editor. That allows much easier searching and reference to the code than if you try to access it all in v8.
