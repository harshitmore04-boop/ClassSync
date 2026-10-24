var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// app/api/auth/route.ts
var route_exports = {};
__export(route_exports, {
  GET: () => GET,
  POST: () => POST,
  dynamic: () => dynamic
});

// server/node_modules/postgres/src/index.js
import os from "os";
import fs from "fs";

// server/node_modules/postgres/src/query.js
var originCache = /* @__PURE__ */ new Map();
var originStackCache = /* @__PURE__ */ new Map();
var originError = Symbol("OriginError");
var CLOSE = {};
var Query = class extends Promise {
  constructor(strings, args, handler2, canceller, options = {}) {
    let resolve, reject;
    super((a, b2) => {
      resolve = a;
      reject = b2;
    });
    this.tagged = Array.isArray(strings.raw);
    this.strings = strings;
    this.args = args;
    this.handler = handler2;
    this.canceller = canceller;
    this.options = options;
    this.state = null;
    this.statement = null;
    this.resolve = (x) => (this.active = false, resolve(x));
    this.reject = (x) => (this.active = false, reject(x));
    this.active = false;
    this.cancelled = null;
    this.executed = false;
    this.signature = "";
    this[originError] = this.handler.debug ? new Error() : this.tagged && cachedError(this.strings);
  }
  get origin() {
    return (this.handler.debug ? this[originError].stack : this.tagged && originStackCache.has(this.strings) ? originStackCache.get(this.strings) : originStackCache.set(this.strings, this[originError].stack).get(this.strings)) || "";
  }
  static get [Symbol.species]() {
    return Promise;
  }
  cancel() {
    return this.canceller && (this.canceller(this), this.canceller = null);
  }
  simple() {
    this.options.simple = true;
    this.options.prepare = false;
    return this;
  }
  async readable() {
    this.simple();
    this.streaming = true;
    return this;
  }
  async writable() {
    this.simple();
    this.streaming = true;
    return this;
  }
  cursor(rows = 1, fn) {
    this.options.simple = false;
    if (typeof rows === "function") {
      fn = rows;
      rows = 1;
    }
    this.cursorRows = rows;
    if (typeof fn === "function")
      return this.cursorFn = fn, this;
    let prev;
    return {
      [Symbol.asyncIterator]: () => ({
        next: () => {
          if (this.executed && !this.active)
            return { done: true };
          prev && prev();
          const promise = new Promise((resolve, reject) => {
            this.cursorFn = (value) => {
              resolve({ value, done: false });
              return new Promise((r) => prev = r);
            };
            this.resolve = () => (this.active = false, resolve({ done: true }));
            this.reject = (x) => (this.active = false, reject(x));
          });
          this.execute();
          return promise;
        },
        return() {
          prev && prev(CLOSE);
          return { done: true };
        }
      })
    };
  }
  describe() {
    this.options.simple = false;
    this.onlyDescribe = this.options.prepare = true;
    return this;
  }
  stream() {
    throw new Error(".stream has been renamed to .forEach");
  }
  forEach(fn) {
    this.forEachFn = fn;
    this.handle();
    return this;
  }
  raw() {
    this.isRaw = true;
    return this;
  }
  values() {
    this.isRaw = "values";
    return this;
  }
  async handle() {
    !this.executed && (this.executed = true) && await 1 && this.handler(this);
  }
  execute() {
    this.handle();
    return this;
  }
  then() {
    this.handle();
    return super.then.apply(this, arguments);
  }
  catch() {
    this.handle();
    return super.catch.apply(this, arguments);
  }
  finally() {
    this.handle();
    return super.finally.apply(this, arguments);
  }
};
function cachedError(xs) {
  if (originCache.has(xs))
    return originCache.get(xs);
  const x = Error.stackTraceLimit;
  Error.stackTraceLimit = 4;
  originCache.set(xs, new Error());
  Error.stackTraceLimit = x;
  return originCache.get(xs);
}

// server/node_modules/postgres/src/errors.js
var PostgresError = class extends Error {
  constructor(x) {
    super(x.message);
    this.name = this.constructor.name;
    Object.assign(this, x);
  }
};
var Errors = {
  connection,
  postgres,
  generic,
  notSupported
};
function connection(x, options, socket) {
  const { host, port } = socket || options;
  const error = Object.assign(
    new Error("write " + x + " " + (options.path || host + ":" + port)),
    {
      code: x,
      errno: x,
      address: options.path || host
    },
    options.path ? {} : { port }
  );
  Error.captureStackTrace(error, connection);
  return error;
}
function postgres(x) {
  const error = new PostgresError(x);
  Error.captureStackTrace(error, postgres);
  return error;
}
function generic(code, message2) {
  const error = Object.assign(new Error(code + ": " + message2), { code });
  Error.captureStackTrace(error, generic);
  return error;
}
function notSupported(x) {
  const error = Object.assign(
    new Error(x + " (B) is not supported"),
    {
      code: "MESSAGE_NOT_SUPPORTED",
      name: x
    }
  );
  Error.captureStackTrace(error, notSupported);
  return error;
}

// server/node_modules/postgres/src/types.js
var types = {
  string: {
    to: 25,
    from: null,
    // defaults to string
    serialize: (x) => "" + x
  },
  number: {
    to: 0,
    from: [21, 23, 26, 700, 701],
    serialize: (x) => "" + x,
    parse: (x) => +x
  },
  json: {
    to: 114,
    from: [114, 3802],
    serialize: (x) => JSON.stringify(x),
    parse: (x) => JSON.parse(x)
  },
  boolean: {
    to: 16,
    from: 16,
    serialize: (x) => x === true ? "t" : "f",
    parse: (x) => x === "t"
  },
  date: {
    to: 1184,
    from: [1082, 1114, 1184],
    serialize: (x) => (x instanceof Date ? x : new Date(x)).toISOString(),
    parse: (x) => new Date(x)
  },
  bytea: {
    to: 17,
    from: 17,
    serialize: (x) => "\\x" + Buffer.from(x).toString("hex"),
    parse: (x) => Buffer.from(x.slice(2), "hex")
  }
};
var NotTagged = class {
  then() {
    notTagged();
  }
  catch() {
    notTagged();
  }
  finally() {
    notTagged();
  }
};
var Identifier = class extends NotTagged {
  constructor(value) {
    super();
    this.value = escapeIdentifier(value);
  }
};
var Parameter = class extends NotTagged {
  constructor(value, type, array) {
    super();
    this.value = value;
    this.type = type;
    this.array = array;
  }
};
var Builder = class extends NotTagged {
  constructor(first, rest) {
    super();
    this.first = first;
    this.rest = rest;
  }
  build(before, parameters, types2, options) {
    const keyword = builders.map(([x, fn]) => ({ fn, i: before.search(x) })).sort((a, b2) => a.i - b2.i).pop();
    return keyword.i === -1 ? escapeIdentifiers(this.first, options) : keyword.fn(this.first, this.rest, parameters, types2, options);
  }
};
function handleValue(x, parameters, types2, options) {
  let value = x instanceof Parameter ? x.value : x;
  if (value === void 0) {
    x instanceof Parameter ? x.value = options.transform.undefined : value = x = options.transform.undefined;
    if (value === void 0)
      throw Errors.generic("UNDEFINED_VALUE", "Undefined values are not allowed");
  }
  return "$" + types2.push(
    x instanceof Parameter ? (parameters.push(x.value), x.array ? x.array[x.type || inferType(x.value)] || x.type || firstIsString(x.value) : x.type) : (parameters.push(x), inferType(x))
  );
}
var defaultHandlers = typeHandlers(types);
function stringify(q, string, value, parameters, types2, options) {
  for (let i = 1; i < q.strings.length; i++) {
    string += stringifyValue(string, value, parameters, types2, options) + q.strings[i];
    value = q.args[i];
  }
  return string;
}
function stringifyValue(string, value, parameters, types2, o) {
  return value instanceof Builder ? value.build(string, parameters, types2, o) : value instanceof Query ? fragment(value, parameters, types2, o) : value instanceof Identifier ? value.value : value && value[0] instanceof Query ? value.reduce((acc, x) => acc + " " + fragment(x, parameters, types2, o), "") : handleValue(value, parameters, types2, o);
}
function fragment(q, parameters, types2, options) {
  q.fragment = true;
  return stringify(q, q.strings[0], q.args[0], parameters, types2, options);
}
function valuesBuilder(first, parameters, types2, columns, options) {
  return first.map(
    (row) => "(" + columns.map(
      (column) => stringifyValue("values", row[column], parameters, types2, options)
    ).join(",") + ")"
  ).join(",");
}
function values(first, rest, parameters, types2, options) {
  const multi = Array.isArray(first[0]);
  const columns = rest.length ? rest.flat() : Object.keys(multi ? first[0] : first);
  return valuesBuilder(multi ? first : [first], parameters, types2, columns, options);
}
function select(first, rest, parameters, types2, options) {
  typeof first === "string" && (first = [first].concat(rest));
  if (Array.isArray(first))
    return escapeIdentifiers(first, options);
  let value;
  const columns = rest.length ? rest.flat() : Object.keys(first);
  return columns.map((x) => {
    value = first[x];
    return (value instanceof Query ? fragment(value, parameters, types2, options) : value instanceof Identifier ? value.value : handleValue(value, parameters, types2, options)) + " as " + escapeIdentifier(options.transform.column.to ? options.transform.column.to(x) : x);
  }).join(",");
}
var builders = Object.entries({
  values,
  in: (...xs) => {
    const x = values(...xs);
    return x === "()" ? "(null)" : x;
  },
  select,
  as: select,
  returning: select,
  "\\(": select,
  update(first, rest, parameters, types2, options) {
    return (rest.length ? rest.flat() : Object.keys(first)).map(
      (x) => escapeIdentifier(options.transform.column.to ? options.transform.column.to(x) : x) + "=" + stringifyValue("values", first[x], parameters, types2, options)
    );
  },
  insert(first, rest, parameters, types2, options) {
    const columns = rest.length ? rest.flat() : Object.keys(Array.isArray(first) ? first[0] : first);
    return "(" + escapeIdentifiers(columns, options) + ")values" + valuesBuilder(Array.isArray(first) ? first : [first], parameters, types2, columns, options);
  }
}).map(([x, fn]) => [new RegExp("((?:^|[\\s(])" + x + "(?:$|[\\s(]))(?![\\s\\S]*\\1)", "i"), fn]);
function notTagged() {
  throw Errors.generic("NOT_TAGGED_CALL", "Query not called as a tagged template literal");
}
var serializers = defaultHandlers.serializers;
var parsers = defaultHandlers.parsers;
function firstIsString(x) {
  if (Array.isArray(x))
    return firstIsString(x[0]);
  return typeof x === "string" ? 1009 : 0;
}
var mergeUserTypes = function(types2) {
  const user = typeHandlers(types2 || {});
  return {
    serializers: Object.assign({}, serializers, user.serializers),
    parsers: Object.assign({}, parsers, user.parsers)
  };
};
function typeHandlers(types2) {
  return Object.keys(types2).reduce((acc, k) => {
    types2[k].from && [].concat(types2[k].from).forEach((x) => acc.parsers[x] = types2[k].parse);
    if (types2[k].serialize) {
      acc.serializers[types2[k].to] = types2[k].serialize;
      types2[k].from && [].concat(types2[k].from).forEach((x) => acc.serializers[x] = types2[k].serialize);
    }
    return acc;
  }, { parsers: {}, serializers: {} });
}
function escapeIdentifiers(xs, { transform: { column } }) {
  return xs.map((x) => escapeIdentifier(column.to ? column.to(x) : x)).join(",");
}
var escapeIdentifier = function escape(str2) {
  return '"' + str2.replace(/"/g, '""').replace(/\./g, '"."') + '"';
};
var inferType = function inferType2(x) {
  return x instanceof Parameter ? x.type : x instanceof Date ? 1184 : x instanceof Uint8Array ? 17 : x === true || x === false ? 16 : typeof x === "bigint" ? 20 : Array.isArray(x) ? inferType2(x[0]) : 0;
};
var escapeBackslash = /\\/g;
var escapeQuote = /"/g;
function arrayEscape(x) {
  return x.replace(escapeBackslash, "\\\\").replace(escapeQuote, '\\"');
}
var arraySerializer = function arraySerializer2(xs, serializer, options, typarray) {
  if (Array.isArray(xs) === false)
    return xs;
  if (!xs.length)
    return "{}";
  const first = xs[0];
  const delimiter = typarray === 1020 ? ";" : ",";
  if (Array.isArray(first) && !first.type)
    return "{" + xs.map((x) => arraySerializer2(x, serializer, options, typarray)).join(delimiter) + "}";
  return "{" + xs.map((x) => {
    if (x === void 0) {
      x = options.transform.undefined;
      if (x === void 0)
        throw Errors.generic("UNDEFINED_VALUE", "Undefined values are not allowed");
    }
    return x === null ? "null" : '"' + arrayEscape(serializer ? serializer(x.type ? x.value : x) : "" + x) + '"';
  }).join(delimiter) + "}";
};
var arrayParserState = {
  i: 0,
  char: null,
  str: "",
  quoted: false,
  last: 0
};
var arrayParser = function arrayParser2(x, parser, typarray) {
  arrayParserState.i = arrayParserState.last = 0;
  return arrayParserLoop(arrayParserState, x, parser, typarray);
};
function arrayParserLoop(s, x, parser, typarray) {
  const xs = [];
  const delimiter = typarray === 1020 ? ";" : ",";
  for (; s.i < x.length; s.i++) {
    s.char = x[s.i];
    if (s.quoted) {
      if (s.char === "\\") {
        s.str += x[++s.i];
      } else if (s.char === '"') {
        xs.push(parser ? parser(s.str) : s.str);
        s.str = "";
        s.quoted = x[s.i + 1] === '"';
        s.last = s.i + 2;
      } else {
        s.str += s.char;
      }
    } else if (s.char === '"') {
      s.quoted = true;
    } else if (s.char === "{") {
      s.last = ++s.i;
      xs.push(arrayParserLoop(s, x, parser, typarray));
    } else if (s.char === "}") {
      s.quoted = false;
      s.last < s.i && xs.push(parser ? parser(x.slice(s.last, s.i)) : x.slice(s.last, s.i));
      s.last = s.i + 1;
      break;
    } else if (s.char === delimiter && s.p !== "}" && s.p !== '"') {
      xs.push(parser ? parser(x.slice(s.last, s.i)) : x.slice(s.last, s.i));
      s.last = s.i + 1;
    }
    s.p = s.char;
  }
  s.last < s.i && xs.push(parser ? parser(x.slice(s.last, s.i + 1)) : x.slice(s.last, s.i + 1));
  return xs;
}
var toCamel = (x) => {
  let str2 = x[0];
  for (let i = 1; i < x.length; i++)
    str2 += x[i] === "_" ? x[++i].toUpperCase() : x[i];
  return str2;
};
var toPascal = (x) => {
  let str2 = x[0].toUpperCase();
  for (let i = 1; i < x.length; i++)
    str2 += x[i] === "_" ? x[++i].toUpperCase() : x[i];
  return str2;
};
var toKebab = (x) => x.replace(/_/g, "-");
var fromCamel = (x) => x.replace(/([A-Z])/g, "_$1").toLowerCase();
var fromPascal = (x) => (x.slice(0, 1) + x.slice(1).replace(/([A-Z])/g, "_$1")).toLowerCase();
var fromKebab = (x) => x.replace(/-/g, "_");
function createJsonTransform(fn) {
  return function jsonTransform(x, column) {
    return typeof x === "object" && x !== null && (column.type === 114 || column.type === 3802) ? Array.isArray(x) ? x.map((x2) => jsonTransform(x2, column)) : Object.entries(x).reduce((acc, [k, v]) => Object.assign(acc, { [fn(k)]: jsonTransform(v, column) }), {}) : x;
  };
}
toCamel.column = { from: toCamel };
toCamel.value = { from: createJsonTransform(toCamel) };
fromCamel.column = { to: fromCamel };
var camel = { ...toCamel };
camel.column.to = fromCamel;
toPascal.column = { from: toPascal };
toPascal.value = { from: createJsonTransform(toPascal) };
fromPascal.column = { to: fromPascal };
var pascal = { ...toPascal };
pascal.column.to = fromPascal;
toKebab.column = { from: toKebab };
toKebab.value = { from: createJsonTransform(toKebab) };
fromKebab.column = { to: fromKebab };
var kebab = { ...toKebab };
kebab.column.to = fromKebab;

// server/node_modules/postgres/src/connection.js
import net from "net";
import tls from "tls";
import crypto2 from "crypto";
import Stream from "stream";
import { performance } from "perf_hooks";

// server/node_modules/postgres/src/result.js
var Result = class extends Array {
  constructor() {
    super();
    Object.defineProperties(this, {
      count: { value: null, writable: true },
      state: { value: null, writable: true },
      command: { value: null, writable: true },
      columns: { value: null, writable: true },
      statement: { value: null, writable: true }
    });
  }
  static get [Symbol.species]() {
    return Array;
  }
};

// server/node_modules/postgres/src/queue.js
var queue_default = Queue;
function Queue(initial = []) {
  let xs = initial.slice();
  let index = 0;
  return {
    get length() {
      return xs.length - index;
    },
    remove: (x) => {
      const index2 = xs.indexOf(x);
      return index2 === -1 ? null : (xs.splice(index2, 1), x);
    },
    push: (x) => (xs.push(x), x),
    shift: () => {
      const out = xs[index++];
      if (index === xs.length) {
        index = 0;
        xs = [];
      } else {
        xs[index - 1] = void 0;
      }
      return out;
    }
  };
}

// server/node_modules/postgres/src/bytes.js
var size = 256;
var buffer = Buffer.allocUnsafe(size);
var messages = "BCcDdEFfHPpQSX".split("").reduce((acc, x) => {
  const v = x.charCodeAt(0);
  acc[x] = () => {
    buffer[0] = v;
    b.i = 5;
    return b;
  };
  return acc;
}, {});
var b = Object.assign(reset, messages, {
  N: String.fromCharCode(0),
  i: 0,
  inc(x) {
    b.i += x;
    return b;
  },
  str(x) {
    const length = Buffer.byteLength(x);
    fit(length);
    b.i += buffer.write(x, b.i, length, "utf8");
    return b;
  },
  i16(x) {
    fit(2);
    buffer.writeUInt16BE(x, b.i);
    b.i += 2;
    return b;
  },
  i32(x, i) {
    if (i || i === 0) {
      buffer.writeUInt32BE(x, i);
      return b;
    }
    fit(4);
    buffer.writeUInt32BE(x, b.i);
    b.i += 4;
    return b;
  },
  z(x) {
    fit(x);
    buffer.fill(0, b.i, b.i + x);
    b.i += x;
    return b;
  },
  raw(x) {
    buffer = Buffer.concat([buffer.subarray(0, b.i), x]);
    b.i = buffer.length;
    return b;
  },
  end(at = 1) {
    buffer.writeUInt32BE(b.i - at, at);
    const out = buffer.subarray(0, b.i);
    b.i = 0;
    buffer = Buffer.allocUnsafe(size);
    return out;
  }
});
var bytes_default = b;
function fit(x) {
  if (buffer.length - b.i < x) {
    const prev = buffer, length = prev.length;
    buffer = Buffer.allocUnsafe(length + (length >> 1) + x);
    prev.copy(buffer);
  }
}
function reset() {
  b.i = 0;
  return b;
}

// server/node_modules/postgres/src/connection.js
var connection_default = Connection;
var uid = 1;
var Sync = bytes_default().S().end();
var Flush = bytes_default().H().end();
var SSLRequest = bytes_default().i32(8).i32(80877103).end(8);
var ExecuteUnnamed = Buffer.concat([bytes_default().E().str(bytes_default.N).i32(0).end(), Sync]);
var DescribeUnnamed = bytes_default().D().str("S").str(bytes_default.N).end();
var noop = () => {
};
var retryRoutines = /* @__PURE__ */ new Set([
  "FetchPreparedStatement",
  "RevalidateCachedQuery",
  "transformAssignedExpr"
]);
var errorFields = {
  83: "severity_local",
  // S
  86: "severity",
  // V
  67: "code",
  // C
  77: "message",
  // M
  68: "detail",
  // D
  72: "hint",
  // H
  80: "position",
  // P
  112: "internal_position",
  // p
  113: "internal_query",
  // q
  87: "where",
  // W
  115: "schema_name",
  // s
  116: "table_name",
  // t
  99: "column_name",
  // c
  100: "data type_name",
  // d
  110: "constraint_name",
  // n
  70: "file",
  // F
  76: "line",
  // L
  82: "routine"
  // R
};
function Connection(options, queues = {}, { onopen = noop, onend = noop, onclose = noop } = {}) {
  const {
    ssl,
    max,
    user,
    host,
    port,
    database: database2,
    parsers: parsers2,
    transform,
    onnotice,
    onnotify,
    onparameter,
    max_pipeline,
    keep_alive,
    backoff: backoff2,
    target_session_attrs
  } = options;
  const sent = queue_default(), id = uid++, backend = { pid: null, secret: null }, idleTimer = timer(end, options.idle_timeout), lifeTimer = timer(end, options.max_lifetime), connectTimer = timer(connectTimedOut, options.connect_timeout);
  let socket = null, cancelMessage, result = new Result(), incoming = Buffer.alloc(0), needsTypes = options.fetch_types, backendParameters = {}, statements = {}, statementId = Math.random().toString(36).slice(2), statementCount = 1, closedDate = 0, remaining = 0, hostIndex = 0, retries = 0, length = 0, delay = 0, rows = 0, serverSignature = null, nextWriteTimer = null, terminated = false, incomings = null, results = null, initial = null, ending = null, stream = null, chunk = null, ended = null, nonce = null, query = null, final = null;
  const connection4 = {
    queue: queues.closed,
    idleTimer,
    connect(query2) {
      initial = query2;
      reconnect();
    },
    terminate,
    execute: execute2,
    cancel,
    end,
    count: 0,
    id
  };
  queues.closed && queues.closed.push(connection4);
  return connection4;
  async function createSocket() {
    let x;
    try {
      x = options.socket ? await Promise.resolve(options.socket(options)) : new net.Socket();
    } catch (e) {
      error(e);
      return;
    }
    x.on("error", error);
    x.on("close", closed);
    x.on("drain", drain);
    return x;
  }
  async function cancel({ pid, secret }, resolve, reject) {
    try {
      cancelMessage = bytes_default().i32(16).i32(80877102).i32(pid).i32(secret).end(16);
      await connect();
      socket.once("error", reject);
      socket.once("close", resolve);
    } catch (error2) {
      reject(error2);
    }
  }
  function execute2(q) {
    if (terminated)
      return queryError(q, Errors.connection("CONNECTION_DESTROYED", options));
    if (q.cancelled)
      return;
    try {
      q.state = backend;
      query ? sent.push(q) : (query = q, query.active = true);
      build(q);
      return write(toBuffer(q)) && !q.describeFirst && !q.cursorFn && sent.length < max_pipeline && (!q.options.onexecute || q.options.onexecute(connection4));
    } catch (error2) {
      sent.length === 0 && write(Sync);
      errored(error2);
      return true;
    }
  }
  function toBuffer(q) {
    if (q.parameters.length >= 65534)
      throw Errors.generic("MAX_PARAMETERS_EXCEEDED", "Max number of parameters (65534) exceeded");
    return q.options.simple ? bytes_default().Q().str(q.statement.string + bytes_default.N).end() : q.describeFirst ? Buffer.concat([describe(q), Flush]) : q.prepare ? q.prepared ? prepared(q) : Buffer.concat([describe(q), prepared(q)]) : unnamed(q);
  }
  function describe(q) {
    return Buffer.concat([
      Parse(q.statement.string, q.parameters, q.statement.types, q.statement.name),
      Describe("S", q.statement.name)
    ]);
  }
  function prepared(q) {
    return Buffer.concat([
      Bind(q.parameters, q.statement.types, q.statement.name, q.cursorName),
      q.cursorFn ? Execute("", q.cursorRows) : ExecuteUnnamed
    ]);
  }
  function unnamed(q) {
    return Buffer.concat([
      Parse(q.statement.string, q.parameters, q.statement.types),
      DescribeUnnamed,
      prepared(q)
    ]);
  }
  function build(q) {
    const parameters = [], types2 = [];
    const string = stringify(q, q.strings[0], q.args[0], parameters, types2, options);
    !q.tagged && q.args.forEach((x) => handleValue(x, parameters, types2, options));
    q.prepare = options.prepare && ("prepare" in q.options ? q.options.prepare : true);
    q.string = string;
    q.signature = q.prepare && types2 + string;
    q.onlyDescribe && delete statements[q.signature];
    q.parameters = q.parameters || parameters;
    q.prepared = q.prepare && q.signature in statements;
    q.describeFirst = q.onlyDescribe || parameters.length && !q.prepared;
    q.statement = q.prepared ? statements[q.signature] : { string, types: types2, name: q.prepare ? statementId + statementCount++ : "" };
    typeof options.debug === "function" && options.debug(id, string, parameters, types2);
  }
  function write(x, fn) {
    chunk = chunk ? Buffer.concat([chunk, x]) : Buffer.from(x);
    if (fn || chunk.length >= 1024)
      return nextWrite(fn);
    nextWriteTimer === null && (nextWriteTimer = setImmediate(nextWrite));
    return true;
  }
  function nextWrite(fn) {
    const x = socket.write(chunk, fn);
    nextWriteTimer !== null && clearImmediate(nextWriteTimer);
    chunk = nextWriteTimer = null;
    return x;
  }
  function connectTimedOut() {
    errored(Errors.connection("CONNECT_TIMEOUT", options, socket));
    socket.destroy();
  }
  async function secure() {
    write(SSLRequest);
    const canSSL = await new Promise((r) => socket.once("data", (x) => r(x[0] === 83)));
    if (!canSSL && ssl === "prefer")
      return connected();
    socket.removeAllListeners();
    socket = tls.connect({
      socket,
      servername: net.isIP(socket.host) ? void 0 : socket.host,
      ...ssl === "require" || ssl === "allow" || ssl === "prefer" ? { rejectUnauthorized: false } : ssl === "verify-full" ? {} : typeof ssl === "object" ? ssl : {}
    });
    socket.on("secureConnect", connected);
    socket.on("error", error);
    socket.on("close", closed);
    socket.on("drain", drain);
  }
  function drain() {
    !query && onopen(connection4);
  }
  function data(x) {
    if (incomings) {
      incomings.push(x);
      remaining -= x.length;
      if (remaining > 0)
        return;
    }
    incoming = incomings ? Buffer.concat(incomings, length - remaining) : incoming.length === 0 ? x : Buffer.concat([incoming, x], incoming.length + x.length);
    while (incoming.length > 4) {
      length = incoming.readUInt32BE(1);
      if (length >= incoming.length) {
        remaining = length - incoming.length;
        incomings = [incoming];
        break;
      }
      try {
        handle(incoming.subarray(0, length + 1));
      } catch (e) {
        query && (query.cursorFn || query.describeFirst) && write(Sync);
        errored(e);
      }
      incoming = incoming.subarray(length + 1);
      remaining = 0;
      incomings = null;
    }
  }
  async function connect() {
    terminated = false;
    backendParameters = {};
    socket || (socket = await createSocket());
    if (!socket)
      return;
    connectTimer.start();
    if (options.socket)
      return ssl ? secure() : connected();
    socket.on("connect", ssl ? secure : connected);
    if (options.path)
      return socket.connect(options.path);
    socket.ssl = ssl;
    socket.connect(port[hostIndex], host[hostIndex]);
    socket.host = host[hostIndex];
    socket.port = port[hostIndex];
    hostIndex = (hostIndex + 1) % port.length;
  }
  function reconnect() {
    setTimeout(connect, closedDate ? closedDate + delay - performance.now() : 0);
  }
  function connected() {
    try {
      statements = {};
      needsTypes = options.fetch_types;
      statementId = Math.random().toString(36).slice(2);
      statementCount = 1;
      lifeTimer.start();
      socket.on("data", data);
      keep_alive && socket.setKeepAlive && socket.setKeepAlive(true, 1e3 * keep_alive);
      const s = StartupMessage();
      write(s);
    } catch (err) {
      error(err);
    }
  }
  function error(err) {
    if (connection4.queue === queues.connecting && options.host[retries + 1])
      return;
    errored(err);
    while (sent.length)
      queryError(sent.shift(), err);
  }
  function errored(err) {
    stream && (stream.destroy(err), stream = null);
    query && queryError(query, err);
    initial && (queryError(initial, err), initial = null);
  }
  function queryError(query2, err) {
    if (query2.reserve)
      return query2.reject(err);
    if (!err || typeof err !== "object")
      err = new Error(err);
    "query" in err || "parameters" in err || Object.defineProperties(err, {
      stack: { value: err.stack + query2.origin.replace(/.*\n/, "\n"), enumerable: options.debug },
      query: { value: query2.string, enumerable: options.debug },
      parameters: { value: query2.parameters, enumerable: options.debug },
      args: { value: query2.args, enumerable: options.debug },
      types: { value: query2.statement && query2.statement.types, enumerable: options.debug }
    });
    query2.reject(err);
  }
  function end() {
    return ending || (!connection4.reserved && onend(connection4), !connection4.reserved && !initial && !query && sent.length === 0 ? (terminate(), new Promise((r) => socket && socket.readyState !== "closed" ? socket.once("close", r) : r())) : ending = new Promise((r) => ended = r));
  }
  function terminate() {
    terminated = true;
    if (stream || query || initial || sent.length)
      error(Errors.connection("CONNECTION_DESTROYED", options));
    clearImmediate(nextWriteTimer);
    if (socket) {
      socket.removeListener("data", data);
      socket.removeListener("connect", connected);
      socket.readyState === "open" && socket.end(bytes_default().X().end());
    }
    ended && (ended(), ending = ended = null);
  }
  async function closed(hadError) {
    incoming = Buffer.alloc(0);
    remaining = 0;
    incomings = null;
    clearImmediate(nextWriteTimer);
    socket.removeListener("data", data);
    socket.removeListener("connect", connected);
    idleTimer.cancel();
    lifeTimer.cancel();
    connectTimer.cancel();
    socket.removeAllListeners();
    socket = null;
    if (initial)
      return reconnect();
    !hadError && (query || sent.length) && error(Errors.connection("CONNECTION_CLOSED", options, socket));
    closedDate = performance.now();
    hadError && options.shared.retries++;
    delay = (typeof backoff2 === "function" ? backoff2(options.shared.retries) : backoff2) * 1e3;
    onclose(connection4, Errors.connection("CONNECTION_CLOSED", options, socket));
  }
  function handle(xs, x = xs[0]) {
    (x === 68 ? DataRow : (
      // D
      x === 100 ? CopyData : (
        // d
        x === 65 ? NotificationResponse : (
          // A
          x === 83 ? ParameterStatus : (
            // S
            x === 90 ? ReadyForQuery : (
              // Z
              x === 67 ? CommandComplete : (
                // C
                x === 50 ? BindComplete : (
                  // 2
                  x === 49 ? ParseComplete : (
                    // 1
                    x === 116 ? ParameterDescription : (
                      // t
                      x === 84 ? RowDescription : (
                        // T
                        x === 82 ? Authentication : (
                          // R
                          x === 110 ? NoData : (
                            // n
                            x === 75 ? BackendKeyData : (
                              // K
                              x === 69 ? ErrorResponse : (
                                // E
                                x === 115 ? PortalSuspended : (
                                  // s
                                  x === 51 ? CloseComplete : (
                                    // 3
                                    x === 71 ? CopyInResponse : (
                                      // G
                                      x === 78 ? NoticeResponse : (
                                        // N
                                        x === 72 ? CopyOutResponse : (
                                          // H
                                          x === 99 ? CopyDone : (
                                            // c
                                            x === 73 ? EmptyQueryResponse : (
                                              // I
                                              x === 86 ? FunctionCallResponse : (
                                                // V
                                                x === 118 ? NegotiateProtocolVersion : (
                                                  // v
                                                  x === 87 ? CopyBothResponse : (
                                                    // W
                                                    /* c8 ignore next */
                                                    UnknownMessage
                                                  )
                                                )
                                              )
                                            )
                                          )
                                        )
                                      )
                                    )
                                  )
                                )
                              )
                            )
                          )
                        )
                      )
                    )
                  )
                )
              )
            )
          )
        )
      )
    ))(xs);
  }
  function DataRow(x) {
    let index = 7;
    let length2;
    let column;
    let value;
    const row = query.isRaw ? new Array(query.statement.columns.length) : {};
    for (let i = 0; i < query.statement.columns.length; i++) {
      column = query.statement.columns[i];
      length2 = x.readInt32BE(index);
      index += 4;
      value = length2 === -1 ? null : query.isRaw === true ? x.subarray(index, index += length2) : column.parser === void 0 ? x.toString("utf8", index, index += length2) : column.parser.array === true ? column.parser(x.toString("utf8", index + 1, index += length2)) : column.parser(x.toString("utf8", index, index += length2));
      query.isRaw ? row[i] = query.isRaw === true ? value : transform.value.from ? transform.value.from(value, column) : value : row[column.name] = transform.value.from ? transform.value.from(value, column) : value;
    }
    query.forEachFn ? query.forEachFn(transform.row.from ? transform.row.from(row) : row, result) : result[rows++] = transform.row.from ? transform.row.from(row) : row;
  }
  function ParameterStatus(x) {
    const [k, v] = x.toString("utf8", 5, x.length - 1).split(bytes_default.N);
    backendParameters[k] = v;
    if (options.parameters[k] !== v) {
      options.parameters[k] = v;
      onparameter && onparameter(k, v);
    }
  }
  function ReadyForQuery(x) {
    query && query.options.simple && query.resolve(results || result);
    query = results = null;
    result = new Result();
    connectTimer.cancel();
    if (initial) {
      if (target_session_attrs) {
        if (!backendParameters.in_hot_standby || !backendParameters.default_transaction_read_only)
          return fetchState();
        else if (tryNext(target_session_attrs, backendParameters))
          return terminate();
      }
      if (needsTypes) {
        initial.reserve && (initial = null);
        return fetchArrayTypes();
      }
      initial && !initial.reserve && execute2(initial);
      options.shared.retries = retries = 0;
      initial = null;
      return;
    }
    while (sent.length && (query = sent.shift()) && (query.active = true, query.cancelled))
      Connection(options).cancel(query.state, query.cancelled.resolve, query.cancelled.reject);
    if (query)
      return;
    connection4.reserved ? !connection4.reserved.release && x[5] === 73 ? ending ? terminate() : (connection4.reserved = null, onopen(connection4)) : connection4.reserved() : ending ? terminate() : onopen(connection4);
  }
  function CommandComplete(x) {
    rows = 0;
    for (let i = x.length - 1; i > 0; i--) {
      if (x[i] === 32 && x[i + 1] < 58 && result.count === null)
        result.count = +x.toString("utf8", i + 1, x.length - 1);
      if (x[i - 1] >= 65) {
        result.command = x.toString("utf8", 5, i);
        result.state = backend;
        break;
      }
    }
    final && (final(), final = null);
    if (result.command === "BEGIN" && max !== 1 && !connection4.reserved)
      return errored(Errors.generic("UNSAFE_TRANSACTION", "Only use sql.begin, sql.reserved or max: 1"));
    if (query.options.simple)
      return BindComplete();
    if (query.cursorFn) {
      result.count && query.cursorFn(result);
      write(Sync);
    }
    query.resolve(result);
  }
  function ParseComplete() {
    query.parsing = false;
  }
  function BindComplete() {
    !result.statement && (result.statement = query.statement);
    result.columns = query.statement.columns;
  }
  function ParameterDescription(x) {
    const length2 = x.readUInt16BE(5);
    for (let i = 0; i < length2; ++i)
      !query.statement.types[i] && (query.statement.types[i] = x.readUInt32BE(7 + i * 4));
    query.prepare && (statements[query.signature] = query.statement);
    query.describeFirst && !query.onlyDescribe && (write(prepared(query)), query.describeFirst = false);
  }
  function RowDescription(x) {
    if (result.command) {
      results = results || [result];
      results.push(result = new Result());
      result.count = null;
      query.statement.columns = null;
    }
    const length2 = x.readUInt16BE(5);
    let index = 7;
    let start;
    query.statement.columns = Array(length2);
    for (let i = 0; i < length2; ++i) {
      start = index;
      while (x[index++] !== 0) ;
      const table = x.readUInt32BE(index);
      const number = x.readUInt16BE(index + 4);
      const type = x.readUInt32BE(index + 6);
      query.statement.columns[i] = {
        name: transform.column.from ? transform.column.from(x.toString("utf8", start, index - 1)) : x.toString("utf8", start, index - 1),
        parser: parsers2[type],
        table,
        number,
        type
      };
      index += 18;
    }
    result.statement = query.statement;
    if (query.onlyDescribe)
      return query.resolve(query.statement), write(Sync);
  }
  async function Authentication(x, type = x.readUInt32BE(5)) {
    (type === 3 ? AuthenticationCleartextPassword : type === 5 ? AuthenticationMD5Password : type === 10 ? SASL : type === 11 ? SASLContinue : type === 12 ? SASLFinal : type !== 0 ? UnknownAuth : noop)(x, type);
  }
  async function AuthenticationCleartextPassword() {
    const payload = await Pass();
    write(
      bytes_default().p().str(payload).z(1).end()
    );
  }
  async function AuthenticationMD5Password(x) {
    const payload = "md5" + await md5(
      Buffer.concat([
        Buffer.from(await md5(await Pass() + user)),
        x.subarray(9)
      ])
    );
    write(
      bytes_default().p().str(payload).z(1).end()
    );
  }
  async function SASL() {
    nonce = (await crypto2.randomBytes(18)).toString("base64");
    bytes_default().p().str("SCRAM-SHA-256" + bytes_default.N);
    const i = bytes_default.i;
    write(bytes_default.inc(4).str("n,,n=*,r=" + nonce).i32(bytes_default.i - i - 4, i).end());
  }
  async function SASLContinue(x) {
    const res = x.toString("utf8", 9).split(",").reduce((acc, x2) => (acc[x2[0]] = x2.slice(2), acc), {});
    const saltedPassword = await crypto2.pbkdf2Sync(
      await Pass(),
      Buffer.from(res.s, "base64"),
      parseInt(res.i),
      32,
      "sha256"
    );
    const clientKey = await hmac(saltedPassword, "Client Key");
    const auth2 = "n=*,r=" + nonce + ",r=" + res.r + ",s=" + res.s + ",i=" + res.i + ",c=biws,r=" + res.r;
    serverSignature = (await hmac(await hmac(saltedPassword, "Server Key"), auth2)).toString("base64");
    const payload = "c=biws,r=" + res.r + ",p=" + xor(
      clientKey,
      Buffer.from(await hmac(await sha256(clientKey), auth2))
    ).toString("base64");
    write(
      bytes_default().p().str(payload).end()
    );
  }
  function SASLFinal(x) {
    if (x.toString("utf8", 9).split(bytes_default.N, 1)[0].slice(2) === serverSignature)
      return;
    errored(Errors.generic("SASL_SIGNATURE_MISMATCH", "The server did not return the correct signature"));
    socket.destroy();
  }
  function Pass() {
    return Promise.resolve(
      typeof options.pass === "function" ? options.pass() : options.pass
    );
  }
  function NoData() {
    result.statement = query.statement;
    result.statement.columns = [];
    if (query.onlyDescribe)
      return query.resolve(query.statement), write(Sync);
  }
  function BackendKeyData(x) {
    backend.pid = x.readUInt32BE(5);
    backend.secret = x.readUInt32BE(9);
  }
  async function fetchArrayTypes() {
    needsTypes = false;
    const types2 = await new Query([`
      select b.oid, b.typarray
      from pg_catalog.pg_type a
      left join pg_catalog.pg_type b on b.oid = a.typelem
      where a.typcategory = 'A'
      group by b.oid, b.typarray
      order by b.oid
    `], [], execute2);
    types2.forEach(({ oid, typarray }) => addArrayType(oid, typarray));
  }
  function addArrayType(oid, typarray) {
    if (!!options.parsers[typarray] && !!options.serializers[typarray]) return;
    const parser = options.parsers[oid];
    options.shared.typeArrayMap[oid] = typarray;
    options.parsers[typarray] = (xs) => arrayParser(xs, parser, typarray);
    options.parsers[typarray].array = true;
    options.serializers[typarray] = (xs) => arraySerializer(xs, options.serializers[oid], options, typarray);
  }
  function tryNext(x, xs) {
    return x === "read-write" && xs.default_transaction_read_only === "on" || x === "read-only" && xs.default_transaction_read_only === "off" || x === "primary" && xs.in_hot_standby === "on" || x === "standby" && xs.in_hot_standby === "off" || x === "prefer-standby" && xs.in_hot_standby === "off" && options.host[retries];
  }
  function fetchState() {
    const query2 = new Query([`
      show transaction_read_only;
      select pg_catalog.pg_is_in_recovery()
    `], [], execute2, null, { simple: true });
    query2.resolve = ([[a], [b2]]) => {
      backendParameters.default_transaction_read_only = a.transaction_read_only;
      backendParameters.in_hot_standby = b2.pg_is_in_recovery ? "on" : "off";
    };
    query2.execute();
  }
  function ErrorResponse(x) {
    query && (query.cursorFn || query.describeFirst) && write(Sync);
    const error2 = Errors.postgres(parseError(x));
    query && query.retried ? errored(query.retried) : query && query.prepared && retryRoutines.has(error2.routine) ? retry(query, error2) : errored(error2);
  }
  function retry(q, error2) {
    delete statements[q.signature];
    q.retried = error2;
    execute2(q);
  }
  function NotificationResponse(x) {
    if (!onnotify)
      return;
    let index = 9;
    while (x[index++] !== 0) ;
    onnotify(
      x.toString("utf8", 9, index - 1),
      x.toString("utf8", index, x.length - 1)
    );
  }
  async function PortalSuspended() {
    try {
      const x = await Promise.resolve(query.cursorFn(result));
      rows = 0;
      x === CLOSE ? write(Close(query.portal)) : (result = new Result(), write(Execute("", query.cursorRows)));
    } catch (err) {
      write(Sync);
      query.reject(err);
    }
  }
  function CloseComplete() {
    result.count && query.cursorFn(result);
    query.resolve(result);
  }
  function CopyInResponse() {
    stream = new Stream.Writable({
      autoDestroy: true,
      write(chunk2, encoding, callback) {
        socket.write(bytes_default().d().raw(chunk2).end(), callback);
      },
      destroy(error2, callback) {
        callback(error2);
        socket.write(bytes_default().f().str(error2 + bytes_default.N).end());
        stream = null;
      },
      final(callback) {
        socket.write(bytes_default().c().end());
        final = callback;
      }
    });
    query.resolve(stream);
  }
  function CopyOutResponse() {
    stream = new Stream.Readable({
      read() {
        socket.resume();
      }
    });
    query.resolve(stream);
  }
  function CopyBothResponse() {
    stream = new Stream.Duplex({
      autoDestroy: true,
      read() {
        socket.resume();
      },
      /* c8 ignore next 11 */
      write(chunk2, encoding, callback) {
        socket.write(bytes_default().d().raw(chunk2).end(), callback);
      },
      destroy(error2, callback) {
        callback(error2);
        socket.write(bytes_default().f().str(error2 + bytes_default.N).end());
        stream = null;
      },
      final(callback) {
        socket.write(bytes_default().c().end());
        final = callback;
      }
    });
    query.resolve(stream);
  }
  function CopyData(x) {
    stream && (stream.push(x.subarray(5)) || socket.pause());
  }
  function CopyDone() {
    stream && stream.push(null);
    stream = null;
  }
  function NoticeResponse(x) {
    onnotice ? onnotice(parseError(x)) : console.log(parseError(x));
  }
  function EmptyQueryResponse() {
  }
  function FunctionCallResponse() {
    errored(Errors.notSupported("FunctionCallResponse"));
  }
  function NegotiateProtocolVersion() {
    errored(Errors.notSupported("NegotiateProtocolVersion"));
  }
  function UnknownMessage(x) {
    console.error("Postgres.js : Unknown Message:", x[0]);
  }
  function UnknownAuth(x, type) {
    console.error("Postgres.js : Unknown Auth:", type);
  }
  function Bind(parameters, types2, statement = "", portal = "") {
    let prev, type;
    bytes_default().B().str(portal + bytes_default.N).str(statement + bytes_default.N).i16(0).i16(parameters.length);
    parameters.forEach((x, i) => {
      if (x === null)
        return bytes_default.i32(4294967295);
      type = types2[i];
      parameters[i] = x = type in options.serializers ? options.serializers[type](x) : "" + x;
      prev = bytes_default.i;
      bytes_default.inc(4).str(x).i32(bytes_default.i - prev - 4, prev);
    });
    bytes_default.i16(0);
    return bytes_default.end();
  }
  function Parse(str2, parameters, types2, name = "") {
    bytes_default().P().str(name + bytes_default.N).str(str2 + bytes_default.N).i16(parameters.length);
    parameters.forEach((x, i) => bytes_default.i32(types2[i] || 0));
    return bytes_default.end();
  }
  function Describe(x, name = "") {
    return bytes_default().D().str(x).str(name + bytes_default.N).end();
  }
  function Execute(portal = "", rows2 = 0) {
    return Buffer.concat([
      bytes_default().E().str(portal + bytes_default.N).i32(rows2).end(),
      Flush
    ]);
  }
  function Close(portal = "") {
    return Buffer.concat([
      bytes_default().C().str("P").str(portal + bytes_default.N).end(),
      bytes_default().S().end()
    ]);
  }
  function StartupMessage() {
    return cancelMessage || bytes_default().inc(4).i16(3).z(2).str(
      Object.entries(Object.assign(
        {
          user,
          database: database2,
          client_encoding: "UTF8"
        },
        options.connection
      )).filter(([, v]) => v).map(([k, v]) => k + bytes_default.N + v).join(bytes_default.N)
    ).z(2).end(0);
  }
}
function parseError(x) {
  const error = {};
  let start = 5;
  for (let i = 5; i < x.length - 1; i++) {
    if (x[i] === 0) {
      error[errorFields[x[start]]] = x.toString("utf8", start + 1, i);
      start = i + 1;
    }
  }
  return error;
}
function md5(x) {
  return crypto2.createHash("md5").update(x).digest("hex");
}
function hmac(key, x) {
  return crypto2.createHmac("sha256", key).update(x).digest();
}
function sha256(x) {
  return crypto2.createHash("sha256").update(x).digest();
}
function xor(a, b2) {
  const length = Math.max(a.length, b2.length);
  const buffer2 = Buffer.allocUnsafe(length);
  for (let i = 0; i < length; i++)
    buffer2[i] = a[i] ^ b2[i];
  return buffer2;
}
function timer(fn, seconds) {
  seconds = typeof seconds === "function" ? seconds() : seconds;
  if (!seconds)
    return { cancel: noop, start: noop };
  let timer2;
  return {
    cancel() {
      timer2 && (clearTimeout(timer2), timer2 = null);
    },
    start() {
      timer2 && clearTimeout(timer2);
      timer2 = setTimeout(done, seconds * 1e3, arguments);
    }
  };
  function done(args) {
    fn.apply(null, args);
    timer2 = null;
  }
}

// server/node_modules/postgres/src/subscribe.js
var noop2 = () => {
};
function Subscribe(postgres2, options) {
  const subscribers = /* @__PURE__ */ new Map(), slot = "postgresjs_" + Math.random().toString(36).slice(2), state = {};
  let connection4, stream, ended = false;
  const sql = subscribe.sql = postgres2({
    ...options,
    transform: { column: {}, value: {}, row: {} },
    max: 1,
    fetch_types: false,
    idle_timeout: null,
    max_lifetime: null,
    connection: {
      ...options.connection,
      replication: "database"
    },
    onclose: async function() {
      if (ended)
        return;
      stream = null;
      state.pid = state.secret = void 0;
      connected(await init(sql, slot, options.publications));
      subscribers.forEach((event) => event.forEach(({ onsubscribe }) => onsubscribe()));
    },
    no_subscribe: true
  });
  const end = sql.end, close = sql.close;
  sql.end = async () => {
    ended = true;
    stream && await new Promise((r) => (stream.once("close", r), stream.end()));
    return end();
  };
  sql.close = async () => {
    stream && await new Promise((r) => (stream.once("close", r), stream.end()));
    return close();
  };
  return subscribe;
  async function subscribe(event, fn, onsubscribe = noop2, onerror = noop2) {
    event = parseEvent(event);
    if (!connection4)
      connection4 = init(sql, slot, options.publications);
    const subscriber = { fn, onsubscribe };
    const fns = subscribers.has(event) ? subscribers.get(event).add(subscriber) : subscribers.set(event, /* @__PURE__ */ new Set([subscriber])).get(event);
    const unsubscribe = () => {
      fns.delete(subscriber);
      fns.size === 0 && subscribers.delete(event);
    };
    return connection4.then((x) => {
      connected(x);
      onsubscribe();
      stream && stream.on("error", onerror);
      return { unsubscribe, state, sql };
    });
  }
  function connected(x) {
    stream = x.stream;
    state.pid = x.state.pid;
    state.secret = x.state.secret;
  }
  async function init(sql2, slot2, publications) {
    if (!publications)
      throw new Error("Missing publication names");
    const xs = await sql2.unsafe(
      `CREATE_REPLICATION_SLOT ${slot2} TEMPORARY LOGICAL pgoutput NOEXPORT_SNAPSHOT`
    );
    const [x] = xs;
    const stream2 = await sql2.unsafe(
      `START_REPLICATION SLOT ${slot2} LOGICAL ${x.consistent_point} (proto_version '1', publication_names '${publications}')`
    ).writable();
    const state2 = {
      lsn: Buffer.concat(x.consistent_point.split("/").map((x2) => Buffer.from(("00000000" + x2).slice(-8), "hex")))
    };
    stream2.on("data", data);
    stream2.on("error", error);
    stream2.on("close", sql2.close);
    return { stream: stream2, state: xs.state };
    function error(e) {
      console.error("Unexpected error during logical streaming - reconnecting", e);
    }
    function data(x2) {
      if (x2[0] === 119) {
        parse(x2.subarray(25), state2, sql2.options.parsers, handle, options.transform);
      } else if (x2[0] === 107 && x2[17]) {
        state2.lsn = x2.subarray(1, 9);
        pong();
      }
    }
    function handle(a, b2) {
      const path = b2.relation.schema + "." + b2.relation.table;
      call("*", a, b2);
      call("*:" + path, a, b2);
      b2.relation.keys.length && call("*:" + path + "=" + b2.relation.keys.map((x2) => a[x2.name]), a, b2);
      call(b2.command, a, b2);
      call(b2.command + ":" + path, a, b2);
      b2.relation.keys.length && call(b2.command + ":" + path + "=" + b2.relation.keys.map((x2) => a[x2.name]), a, b2);
    }
    function pong() {
      const x2 = Buffer.alloc(34);
      x2[0] = "r".charCodeAt(0);
      x2.fill(state2.lsn, 1);
      x2.writeBigInt64BE(BigInt(Date.now() - Date.UTC(2e3, 0, 1)) * BigInt(1e3), 25);
      stream2.write(x2);
    }
  }
  function call(x, a, b2) {
    subscribers.has(x) && subscribers.get(x).forEach(({ fn }) => fn(a, b2, x));
  }
}
function Time(x) {
  return new Date(Date.UTC(2e3, 0, 1) + Number(x / BigInt(1e3)));
}
function parse(x, state, parsers2, handle, transform) {
  const char = (acc, [k, v]) => (acc[k.charCodeAt(0)] = v, acc);
  Object.entries({
    R: (x2) => {
      let i = 1;
      const r = state[x2.readUInt32BE(i)] = {
        schema: x2.toString("utf8", i += 4, i = x2.indexOf(0, i)) || "pg_catalog",
        table: x2.toString("utf8", i + 1, i = x2.indexOf(0, i + 1)),
        columns: Array(x2.readUInt16BE(i += 2)),
        keys: []
      };
      i += 2;
      let columnIndex = 0, column;
      while (i < x2.length) {
        column = r.columns[columnIndex++] = {
          key: x2[i++],
          name: transform.column.from ? transform.column.from(x2.toString("utf8", i, i = x2.indexOf(0, i))) : x2.toString("utf8", i, i = x2.indexOf(0, i)),
          type: x2.readUInt32BE(i += 1),
          parser: parsers2[x2.readUInt32BE(i)],
          atttypmod: x2.readUInt32BE(i += 4)
        };
        column.key && r.keys.push(column);
        i += 4;
      }
    },
    Y: () => {
    },
    // Type
    O: () => {
    },
    // Origin
    B: (x2) => {
      state.date = Time(x2.readBigInt64BE(9));
      state.lsn = x2.subarray(1, 9);
    },
    I: (x2) => {
      let i = 1;
      const relation = state[x2.readUInt32BE(i)];
      const { row } = tuples(x2, relation.columns, i += 7, transform);
      handle(row, {
        command: "insert",
        relation
      });
    },
    D: (x2) => {
      let i = 1;
      const relation = state[x2.readUInt32BE(i)];
      i += 4;
      const key = x2[i] === 75;
      handle(
        key || x2[i] === 79 ? tuples(x2, relation.columns, i += 3, transform).row : null,
        {
          command: "delete",
          relation,
          key
        }
      );
    },
    U: (x2) => {
      let i = 1;
      const relation = state[x2.readUInt32BE(i)];
      i += 4;
      const key = x2[i] === 75;
      const xs = key || x2[i] === 79 ? tuples(x2, relation.columns, i += 3, transform) : null;
      xs && (i = xs.i);
      const { row } = tuples(x2, relation.columns, i + 3, transform);
      handle(row, {
        command: "update",
        relation,
        key,
        old: xs && xs.row
      });
    },
    T: () => {
    },
    // Truncate,
    C: () => {
    }
    // Commit
  }).reduce(char, {})[x[0]](x);
}
function tuples(x, columns, xi, transform) {
  let type, column, value;
  const row = transform.raw ? new Array(columns.length) : {};
  for (let i = 0; i < columns.length; i++) {
    type = x[xi++];
    column = columns[i];
    value = type === 110 ? null : type === 117 ? void 0 : column.parser === void 0 ? x.toString("utf8", xi + 4, xi += 4 + x.readUInt32BE(xi)) : column.parser.array === true ? column.parser(x.toString("utf8", xi + 5, xi += 4 + x.readUInt32BE(xi))) : column.parser(x.toString("utf8", xi + 4, xi += 4 + x.readUInt32BE(xi)));
    transform.raw ? row[i] = transform.raw === true ? value : transform.value.from ? transform.value.from(value, column) : value : row[column.name] = transform.value.from ? transform.value.from(value, column) : value;
  }
  return { i: xi, row: transform.row.from ? transform.row.from(row) : row };
}
function parseEvent(x) {
  const xs = x.match(/^(\*|insert|update|delete)?:?([^.]+?\.?[^=]+)?=?(.+)?/i) || [];
  if (!xs)
    throw new Error("Malformed subscribe pattern: " + x);
  const [, command, path, key] = xs;
  return (command || "*") + (path ? ":" + (path.indexOf(".") === -1 ? "public." + path : path) : "") + (key ? "=" + key : "");
}

// server/node_modules/postgres/src/large.js
import Stream2 from "stream";
function largeObject(sql, oid, mode = 131072 | 262144) {
  return new Promise(async (resolve, reject) => {
    await sql.begin(async (sql2) => {
      let finish;
      !oid && ([{ oid }] = await sql2`select lo_creat(-1) as oid`);
      const [{ fd }] = await sql2`select lo_open(${oid}, ${mode}) as fd`;
      const lo = {
        writable,
        readable,
        close: () => sql2`select lo_close(${fd})`.then(finish),
        tell: () => sql2`select lo_tell64(${fd})`,
        read: (x) => sql2`select loread(${fd}, ${x}) as data`,
        write: (x) => sql2`select lowrite(${fd}, ${x})`,
        truncate: (x) => sql2`select lo_truncate64(${fd}, ${x})`,
        seek: (x, whence = 0) => sql2`select lo_lseek64(${fd}, ${x}, ${whence})`,
        size: () => sql2`
          select
            lo_lseek64(${fd}, location, 0) as position,
            seek.size
          from (
            select
              lo_lseek64($1, 0, 2) as size,
              tell.location
            from (select lo_tell64($1) as location) tell
          ) seek
        `
      };
      resolve(lo);
      return new Promise(async (r) => finish = r);
      async function readable({
        highWaterMark = 2048 * 8,
        start = 0,
        end = Infinity
      } = {}) {
        let max = end - start;
        start && await lo.seek(start);
        return new Stream2.Readable({
          highWaterMark,
          async read(size2) {
            const l = size2 > max ? size2 - max : size2;
            max -= size2;
            const [{ data }] = await lo.read(l);
            this.push(data);
            if (data.length < size2)
              this.push(null);
          }
        });
      }
      async function writable({
        highWaterMark = 2048 * 8,
        start = 0
      } = {}) {
        start && await lo.seek(start);
        return new Stream2.Writable({
          highWaterMark,
          write(chunk, encoding, callback) {
            lo.write(chunk).then(() => callback(), callback);
          }
        });
      }
    }).catch(reject);
  });
}

// server/node_modules/postgres/src/index.js
Object.assign(Postgres, {
  PostgresError,
  toPascal,
  pascal,
  toCamel,
  camel,
  toKebab,
  kebab,
  fromPascal,
  fromCamel,
  fromKebab,
  BigInt: {
    to: 20,
    from: [20],
    parse: (x) => BigInt(x),
    // eslint-disable-line
    serialize: (x) => x.toString()
  }
});
var src_default = Postgres;
function Postgres(a, b2) {
  const options = parseOptions(a, b2), subscribe = options.no_subscribe || Subscribe(Postgres, { ...options });
  let ending = false;
  const queries = queue_default(), connecting = queue_default(), reserved = queue_default(), closed = queue_default(), ended = queue_default(), open = queue_default(), busy = queue_default(), full = queue_default(), queues = { connecting, reserved, closed, ended, open, busy, full };
  const connections = [...Array(options.max)].map(() => connection_default(options, queues, { onopen, onend, onclose }));
  const sql = Sql(handler2);
  Object.assign(sql, {
    get parameters() {
      return options.parameters;
    },
    largeObject: largeObject.bind(null, sql),
    subscribe,
    CLOSE,
    END: CLOSE,
    PostgresError,
    options,
    reserve,
    listen,
    begin,
    close,
    end
  });
  return sql;
  function Sql(handler3) {
    handler3.debug = options.debug;
    Object.entries(options.types).reduce((acc, [name, type]) => {
      acc[name] = (x) => new Parameter(x, type.to);
      return acc;
    }, typed);
    Object.assign(sql2, {
      types: typed,
      typed,
      unsafe,
      notify,
      array,
      json,
      file
    });
    return sql2;
    function typed(value, type) {
      return new Parameter(value, type);
    }
    function sql2(strings, ...args) {
      const query = strings && Array.isArray(strings.raw) ? new Query(strings, args, handler3, cancel) : typeof strings === "string" && !args.length ? new Identifier(options.transform.column.to ? options.transform.column.to(strings) : strings) : new Builder(strings, args);
      return query;
    }
    function unsafe(string, args = [], options2 = {}) {
      arguments.length === 2 && !Array.isArray(args) && (options2 = args, args = []);
      const query = new Query([string], args, handler3, cancel, {
        prepare: false,
        ...options2,
        simple: "simple" in options2 ? options2.simple : args.length === 0
      });
      return query;
    }
    function file(path, args = [], options2 = {}) {
      arguments.length === 2 && !Array.isArray(args) && (options2 = args, args = []);
      const query = new Query([], args, (query2) => {
        fs.readFile(path, "utf8", (err, string) => {
          if (err)
            return query2.reject(err);
          query2.strings = [string];
          handler3(query2);
        });
      }, cancel, {
        ...options2,
        simple: "simple" in options2 ? options2.simple : args.length === 0
      });
      return query;
    }
  }
  async function listen(name, fn, onlisten) {
    const listener = { fn, onlisten };
    const sql2 = listen.sql || (listen.sql = Postgres({
      ...options,
      max: 1,
      idle_timeout: null,
      max_lifetime: null,
      fetch_types: false,
      onclose() {
        Object.entries(listen.channels).forEach(([name2, { listeners }]) => {
          delete listen.channels[name2];
          Promise.all(listeners.map((l) => listen(name2, l.fn, l.onlisten).catch(() => {
          })));
        });
      },
      onnotify(c, x) {
        c in listen.channels && listen.channels[c].listeners.forEach((l) => l.fn(x));
      }
    }));
    const channels = listen.channels || (listen.channels = {}), exists = name in channels;
    if (exists) {
      channels[name].listeners.push(listener);
      const result2 = await channels[name].result;
      listener.onlisten && listener.onlisten();
      return { state: result2.state, unlisten };
    }
    channels[name] = { result: sql2`listen ${sql2.unsafe('"' + name.replace(/"/g, '""') + '"')}`, listeners: [listener] };
    const result = await channels[name].result;
    listener.onlisten && listener.onlisten();
    return { state: result.state, unlisten };
    async function unlisten() {
      if (name in channels === false)
        return;
      channels[name].listeners = channels[name].listeners.filter((x) => x !== listener);
      if (channels[name].listeners.length)
        return;
      delete channels[name];
      return sql2`unlisten ${sql2.unsafe('"' + name.replace(/"/g, '""') + '"')}`;
    }
  }
  async function notify(channel, payload) {
    return await sql`select pg_notify(${channel}, ${"" + payload})`;
  }
  async function reserve() {
    const queue = queue_default();
    const c = open.length ? open.shift() : await new Promise((resolve, reject) => {
      const query = { reserve: resolve, reject };
      queries.push(query);
      closed.length && connect(closed.shift(), query);
    });
    move(c, reserved);
    c.reserved = () => queue.length ? c.execute(queue.shift()) : move(c, reserved);
    c.reserved.release = true;
    const sql2 = Sql(handler3);
    sql2.release = () => {
      c.reserved = null;
      onopen(c);
    };
    return sql2;
    function handler3(q) {
      c.queue === full ? queue.push(q) : c.execute(q) || move(c, full);
    }
  }
  async function begin(options2, fn) {
    !fn && (fn = options2, options2 = "");
    const queries2 = queue_default();
    let savepoints = 0, connection4, prepare = null;
    try {
      await sql.unsafe("begin " + options2.replace(/[^a-z ]/ig, ""), [], { onexecute }).execute();
      return await Promise.race([
        scope(connection4, fn),
        new Promise((_, reject) => connection4.onclose = reject)
      ]);
    } catch (error) {
      throw error;
    }
    async function scope(c, fn2, name) {
      const sql2 = Sql(handler3);
      sql2.savepoint = savepoint;
      sql2.prepare = (x) => prepare = x.replace(/[^a-z0-9$-_. ]/gi);
      let uncaughtError, result;
      name && await sql2`savepoint ${sql2(name)}`;
      try {
        result = await new Promise((resolve, reject) => {
          const x = fn2(sql2);
          Promise.resolve(Array.isArray(x) ? Promise.all(x) : x).then(resolve, reject);
        });
        if (uncaughtError)
          throw uncaughtError;
      } catch (e) {
        await (name ? sql2`rollback to ${sql2(name)}` : sql2`rollback`);
        throw e instanceof PostgresError && e.code === "25P02" && uncaughtError || e;
      }
      if (!name) {
        prepare ? await sql2`prepare transaction '${sql2.unsafe(prepare)}'` : await sql2`commit`;
      }
      return result;
      function savepoint(name2, fn3) {
        if (name2 && Array.isArray(name2.raw))
          return savepoint((sql3) => sql3.apply(sql3, arguments));
        arguments.length === 1 && (fn3 = name2, name2 = null);
        return scope(c, fn3, "s" + savepoints++ + (name2 ? "_" + name2 : ""));
      }
      function handler3(q) {
        q.catch((e) => uncaughtError || (uncaughtError = e));
        c.queue === full ? queries2.push(q) : c.execute(q) || move(c, full);
      }
    }
    function onexecute(c) {
      connection4 = c;
      move(c, reserved);
      c.reserved = () => queries2.length ? c.execute(queries2.shift()) : move(c, reserved);
    }
  }
  function move(c, queue) {
    c.queue.remove(c);
    queue.push(c);
    c.queue = queue;
    queue === open ? c.idleTimer.start() : c.idleTimer.cancel();
    return c;
  }
  function json(x) {
    return new Parameter(x, 3802);
  }
  function array(x, type) {
    if (!Array.isArray(x))
      return array(Array.from(arguments));
    return new Parameter(x, type || (x.length ? inferType(x) || 25 : 0), options.shared.typeArrayMap);
  }
  function handler2(query) {
    if (ending)
      return query.reject(Errors.connection("CONNECTION_ENDED", options, options));
    if (open.length)
      return go(open.shift(), query);
    if (closed.length)
      return connect(closed.shift(), query);
    busy.length ? go(busy.shift(), query) : queries.push(query);
  }
  function go(c, query) {
    return c.execute(query) ? move(c, busy) : move(c, full);
  }
  function cancel(query) {
    return new Promise((resolve, reject) => {
      query.state ? query.active ? connection_default(options).cancel(query.state, resolve, reject) : query.cancelled = { resolve, reject } : (queries.remove(query), query.cancelled = true, query.reject(Errors.generic("57014", "canceling statement due to user request")), resolve());
    });
  }
  async function end({ timeout = null } = {}) {
    if (ending)
      return ending;
    await 1;
    let timer2;
    return ending = Promise.race([
      new Promise((r) => timeout !== null && (timer2 = setTimeout(destroy, timeout * 1e3, r))),
      Promise.all(connections.map((c) => c.end()).concat(
        listen.sql ? listen.sql.end({ timeout: 0 }) : [],
        subscribe.sql ? subscribe.sql.end({ timeout: 0 }) : []
      ))
    ]).then(() => clearTimeout(timer2));
  }
  async function close() {
    await Promise.all(connections.map((c) => c.end()));
  }
  async function destroy(resolve) {
    await Promise.all(connections.map((c) => c.terminate()));
    while (queries.length)
      queries.shift().reject(Errors.connection("CONNECTION_DESTROYED", options));
    resolve();
  }
  function connect(c, query) {
    move(c, connecting);
    c.connect(query);
    return c;
  }
  function onend(c) {
    move(c, ended);
  }
  function onopen(c) {
    if (queries.length === 0)
      return move(c, open);
    let max = Math.ceil(queries.length / (connecting.length + 1)), ready = true;
    while (ready && queries.length && max-- > 0) {
      const query = queries.shift();
      if (query.reserve)
        return query.reserve(c);
      ready = c.execute(query);
    }
    ready ? move(c, busy) : move(c, full);
  }
  function onclose(c, e) {
    move(c, closed);
    c.reserved = null;
    c.onclose && (c.onclose(e), c.onclose = null);
    options.onclose && options.onclose(c.id);
    queries.length && connect(c, queries.shift());
  }
}
function parseOptions(a, b2) {
  if (a && a.shared)
    return a;
  const env2 = process.env, o = (!a || typeof a === "string" ? b2 : a) || {}, { url, multihost } = parseUrl(a), query = [...url.searchParams].reduce((a2, [b3, c]) => (a2[b3] = c, a2), {}), host = o.hostname || o.host || multihost || url.hostname || env2.PGHOST || "localhost", port = o.port || url.port || env2.PGPORT || 5432, user = o.user || o.username || url.username || env2.PGUSERNAME || env2.PGUSER || osUsername();
  o.no_prepare && (o.prepare = false);
  query.sslmode && (query.ssl = query.sslmode, delete query.sslmode);
  "timeout" in o && (console.log("The timeout option is deprecated, use idle_timeout instead"), o.idle_timeout = o.timeout);
  query.sslrootcert === "system" && (query.ssl = "verify-full");
  const ints = ["idle_timeout", "connect_timeout", "max_lifetime", "max_pipeline", "backoff", "keep_alive"];
  const defaults = {
    max: 10,
    ssl: false,
    idle_timeout: null,
    connect_timeout: 30,
    max_lifetime,
    max_pipeline: 100,
    backoff,
    keep_alive: 60,
    prepare: true,
    debug: false,
    fetch_types: true,
    publications: "alltables",
    target_session_attrs: null
  };
  return {
    host: Array.isArray(host) ? host : host.split(",").map((x) => x.split(":")[0]),
    port: Array.isArray(port) ? port : host.split(",").map((x) => parseInt(x.split(":")[1] || port)),
    path: o.path || host.indexOf("/") > -1 && host + "/.s.PGSQL." + port,
    database: o.database || o.db || (url.pathname || "").slice(1) || env2.PGDATABASE || user,
    user,
    pass: o.pass || o.password || url.password || env2.PGPASSWORD || "",
    ...Object.entries(defaults).reduce(
      (acc, [k, d]) => {
        const value = k in o ? o[k] : k in query ? query[k] === "disable" || query[k] === "false" ? false : query[k] : env2["PG" + k.toUpperCase()] || d;
        acc[k] = typeof value === "string" && ints.includes(k) ? +value : value;
        return acc;
      },
      {}
    ),
    connection: {
      application_name: env2.PGAPPNAME || "postgres.js",
      ...o.connection,
      ...Object.entries(query).reduce((acc, [k, v]) => (k in defaults || (acc[k] = v), acc), {})
    },
    types: o.types || {},
    target_session_attrs: tsa(o, url, env2),
    onnotice: o.onnotice,
    onnotify: o.onnotify,
    onclose: o.onclose,
    onparameter: o.onparameter,
    socket: o.socket,
    transform: parseTransform(o.transform || { undefined: void 0 }),
    parameters: {},
    shared: { retries: 0, typeArrayMap: {} },
    ...mergeUserTypes(o.types)
  };
}
function tsa(o, url, env2) {
  const x = o.target_session_attrs || url.searchParams.get("target_session_attrs") || env2.PGTARGETSESSIONATTRS;
  if (!x || ["read-write", "read-only", "primary", "standby", "prefer-standby"].includes(x))
    return x;
  throw new Error("target_session_attrs " + x + " is not supported");
}
function backoff(retries) {
  return (0.5 + Math.random() / 2) * Math.min(3 ** retries / 100, 20);
}
function max_lifetime() {
  return 60 * (30 + Math.random() * 30);
}
function parseTransform(x) {
  return {
    undefined: x.undefined,
    column: {
      from: typeof x.column === "function" ? x.column : x.column && x.column.from,
      to: x.column && x.column.to
    },
    value: {
      from: typeof x.value === "function" ? x.value : x.value && x.value.from,
      to: x.value && x.value.to
    },
    row: {
      from: typeof x.row === "function" ? x.row : x.row && x.row.from,
      to: x.row && x.row.to
    }
  };
}
function parseUrl(url) {
  if (!url || typeof url !== "string")
    return { url: { searchParams: /* @__PURE__ */ new Map() } };
  let host = url;
  host = host.slice(host.indexOf("://") + 3).split(/[?/]/)[0];
  host = decodeURIComponent(host.slice(host.indexOf("@") + 1));
  const urlObj = new URL(url.replace(host, host.split(",")[0]));
  return {
    url: {
      username: decodeURIComponent(urlObj.username),
      password: decodeURIComponent(urlObj.password),
      host: urlObj.host,
      hostname: urlObj.hostname,
      port: urlObj.port,
      pathname: urlObj.pathname,
      searchParams: urlObj.searchParams
    },
    multihost: host.indexOf(",") > -1 && host
  };
}
function osUsername() {
  try {
    return os.userInfo().username;
  } catch (_) {
    return process.env.USERNAME || process.env.USER || process.env.LOGNAME;
  }
}

// server/database.mjs
var client;
function connection2() {
  return client ??= src_default(process.env.DATABASE_URL, { ssl: "require", prepare: false, max: 1, idle_timeout: 20, connect_timeout: 15, types: { bigint: { to: 20, from: [20], serialize: String, parse: Number } } });
}
function compile(query, values2) {
  let index = 0, quote = false, out = "";
  for (let i = 0; i < query.length; i++) {
    const c = query[i];
    if (c === "'") {
      if (quote && query[i + 1] === "'") {
        out += "''";
        i++;
        continue;
      }
      quote = !quote;
    }
    if (c === "?" && !quote) {
      const v = values2[index++];
      out += v === null ? "NULL" : `$${index}${typeof v === "number" ? "::bigint" : "::text"}`;
    } else out += c;
  }
  const args = [];
  out = out.replace(/\$(\d+)(::\w+)?/g, (_, n, cast) => {
    args.push(values2[Number(n) - 1]);
    return "$" + args.length + (cast || "");
  });
  out = out.replace(/SET hits=hits\+1/gi, "SET hits=auth_attempts.hits+1");
  out = out.replace(/INSERT OR IGNORE INTO/gi, "INSERT INTO").replace(/\bMIN\(created_at,/gi, "LEAST(created_at,");
  if (/INSERT OR IGNORE INTO/i.test(query)) out += " ON CONFLICT DO NOTHING";
  return { query: out, values: args };
}
function normalize(rows) {
  return rows.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, typeof value === "bigint" ? Number(value) : value])));
}
async function execute(tx, statement) {
  const compiled = compile(statement.query, statement.values);
  const rows = await tx.unsafe(compiled.query, compiled.values);
  const result = normalize(rows);
  return { results: result, meta: { changes: rows.count || 0 } };
}
async function transaction(callback) {
  return connection2().begin(async (tx) => {
    await tx.unsafe("SET LOCAL search_path TO classsync");
    return callback(tx);
  });
}
var database = { prepare(query) {
  return { query, values: [], bind(...values2) {
    this.values = values2;
    return this;
  }, async run() {
    return transaction((tx) => execute(tx, this));
  }, async all() {
    return this.run();
  }, async first() {
    return (await this.run()).results[0] || null;
  } };
}, async batch(statements) {
  return transaction(async (tx) => {
    const results = [];
    for (const statement of statements) results.push(await execute(tx, statement));
    return results;
  });
} };

// server/env.ts
var env = new Proxy({ DB: database }, { get(target, key) {
  return key in target ? target[key] : process.env[key];
} });

// app/lib/email-verification.ts
function emailVerificationEnabled() {
  return env.SUPABASE_OTP_ENABLED === "true" && !!env.SUPABASE_URL && !!env.SUPABASE_PUBLISHABLE_KEY;
}
async function authCall(path, body, token) {
  const settings = env, url = new URL(settings.SUPABASE_URL);
  if (url.protocol !== "https:" || !url.hostname.endsWith(".supabase.co")) throw Error("Email verification is not configured.");
  const response = await fetch(new URL("/auth/v1/" + path, url), { method: body ? "POST" : "GET", headers: { apikey: settings.SUPABASE_PUBLISHABLE_KEY, "Content-Type": "application/json", ...token ? { Authorization: "Bearer " + token } : {} }, ...body ? { body: JSON.stringify(body) } : {}, signal: AbortSignal.timeout(15e3) });
  const value = await response.json();
  if (!response.ok) {
    if (response.status === 429) throw Error("Please wait before requesting another email code.");
    if (path === "verify" || path === "user") throw Error("The verification code is invalid or expired. Request a new code.");
    throw Error("Email delivery is unavailable. Ask the teacher to check email settings.");
  }
  return value;
}
async function sendEmailCode(email) {
  await authCall("otp", { email, create_user: true });
}
async function verifyEmailCode(email, code) {
  if (!/^\d{6,8}$/.test(code)) throw Error("Enter the verification code from your email.");
  const value = await authCall("verify", { email, token: code, type: "email" });
  if (!value.access_token || !value.user?.email_confirmed_at || value.user.email?.toLowerCase() !== email) throw Error("Email could not be verified.");
  return value.access_token;
}
async function verifyEmailProof(email, token) {
  if (typeof token !== "string" || token.length > 5e3 || !token) throw Error("Verify your email before creating the account.");
  const user = await authCall("user", void 0, token);
  if (!user.email_confirmed_at || user.email?.toLowerCase() !== email) throw Error("Verify the same email used for this account.");
}

// app/lib/trusted-proxy.ts
async function proxyRequest(request) {
  const signature = request.headers.get("x-classsync-proxy-signature");
  if (!signature) return request;
  const secret = env.CLASS_SYNC_PROXY_SECRET, ip = request.headers.get("x-classsync-proxy-ip") || "", time = request.headers.get("x-classsync-proxy-time") || "";
  if (!secret || !/^\d{13}$/.test(time) || Math.abs(Date.now() - Number(time)) > 3e4 || !/^[a-f0-9]{64}$/.test(signature) || !ip || ip.length > 64) throw Error("Invalid proxy request.");
  const encoder2 = new TextEncoder(), url = new URL(request.url), body = ["GET", "HEAD"].includes(request.method) ? "" : await request.clone().text();
  const hash = async (s) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder2.encode(s))), (b2) => b2.toString(16).padStart(2, "0")).join("");
  const message2 = [request.method, url.pathname + url.search, ip, time, await hash(body), await hash(request.headers.get("cookie") || "")].join("\n");
  const key = await crypto.subtle.importKey("raw", encoder2.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const valid = await crypto.subtle.verify("HMAC", key, Uint8Array.from(signature.match(/../g), (s) => parseInt(s, 16)), encoder2.encode(message2));
  if (!valid) throw Error("Invalid proxy request.");
  const headers = new Headers(request.headers);
  headers.set("cf-connecting-ip", ip);
  return new Request(request.url, { method: request.method, headers, ...!["GET", "HEAD"].includes(request.method) ? { body } : {} });
}

// app/lib/accounts.ts
var COOKIE = "classsync_session";
var encoder = new TextEncoder();
var hex = (bytes) => Array.from(new Uint8Array(bytes)).map((b2) => b2.toString(16).padStart(2, "0")).join("");
var digest = async (value) => hex(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
var randomToken = () => hex(crypto.getRandomValues(new Uint8Array(32)));
async function passwordHash(password, salt, iterations = 1e5) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", salt: encoder.encode(salt), iterations, hash: "SHA-256" }, key, 256));
}
function equal(a, b2) {
  let difference = a.length ^ b2.length;
  for (let i = 0; i < Math.max(a.length, b2.length); i++) difference |= (a.charCodeAt(i) || 0) ^ (b2.charCodeAt(i) || 0);
  return difference === 0;
}
function cookieToken(request) {
  return request.headers.get("cookie")?.split(";").map((s) => s.trim()).find((s) => s.startsWith(COOKIE + "="))?.slice(COOKIE.length + 1) || "";
}
function sessionCookie(request, token, maxAge = 604800) {
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`;
}
async function getAccountUser(request) {
  const token = cookieToken(request);
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const account = await env.DB.prepare("SELECT a.id,a.email,a.name,a.role FROM account_sessions s JOIN accounts a ON a.id=s.account_id WHERE s.token_hash=? AND s.expires>?").bind(await digest(token), Date.now()).first();
  return account ? { userId: account.id, email: account.email, displayName: account.name, role: account.role } : null;
}
async function createSession(request, accountId) {
  const token = randomToken();
  await env.DB.batch([env.DB.prepare("DELETE FROM account_sessions WHERE expires<?").bind(Date.now()), env.DB.prepare("INSERT INTO account_sessions (token_hash,account_id,expires) VALUES (?,?,?)").bind(await digest(token), accountId, Date.now() + 6048e5)]);
  return sessionCookie(request, token);
}
async function reserveAuthAttempt(request, email) {
  const db = env.DB, now = Date.now(), bucket = Math.floor(now / 9e5), ip = request.headers.get("cf-connecting-ip") || "local";
  const keys = [{ key: await digest("email:" + email + ":" + bucket), limit: 12 }, { key: await digest("ip:" + ip + ":" + bucket), limit: 100 }];
  await db.prepare("DELETE FROM auth_attempts WHERE expires<?").bind(now).run();
  for (const entry of keys) {
    await db.prepare("INSERT INTO auth_attempts (id,hits,expires) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET hits=hits+1").bind(entry.key, (bucket + 1) * 9e5).run();
    const row = await db.prepare("SELECT hits FROM auth_attempts WHERE id=?").bind(entry.key).first();
    if (row.hits > entry.limit) return null;
  }
  return keys[0].key;
}
async function issueStudentInvite(studentId) {
  const token = randomToken();
  await env.DB.batch([env.DB.prepare("DELETE FROM account_invites WHERE student_id=? OR expires<?").bind(studentId, Date.now()), env.DB.prepare("INSERT INTO account_invites (token_hash,student_id,expires) VALUES (?,?,?)").bind(await digest(token), studentId, Date.now() + 864e5)]);
  return token;
}

// app/api/auth/route.ts
var dynamic = "force-dynamic";
var reply = (body, status = 200, cookie) => Response.json(body, { status, headers: { "Cache-Control": "no-store", ...cookie ? { "Set-Cookie": cookie } : {} } });
async function GET(request) {
  try {
    request = await proxyRequest(request);
    const user = await getAccountUser(request);
    return reply({ user: user ? { email: user.email, name: user.displayName, role: user.role } : null, emailOtpEnabled: emailVerificationEnabled(), teacherSetupAvailable: !await env.DB.prepare("SELECT id FROM accounts WHERE teacher_slot='classroom'").first() });
  } catch (error) {
    console.error("ClassSync account service error:", error instanceof Error ? error.message : "unknown");
    return reply({ error: "Account service unavailable." }, 503);
  }
}
async function POST(request) {
  try {
    request = await proxyRequest(request);
    if (request.headers.get("origin") !== new URL(request.url).origin) return reply({ error: "Request origin rejected." }, 403);
    const raw = await request.text();
    if (raw.length > 6e3) return reply({ error: "Request too large." }, 413);
    let b2;
    try {
      b2 = JSON.parse(raw);
    } catch {
      return reply({ error: "Send valid account details." }, 400);
    }
    if (!b2 || typeof b2 !== "object") return reply({ error: "Send valid account details." }, 400);
    if (b2.action === "logout") {
      const token = cookieToken(request);
      if (token) await env.DB.prepare("DELETE FROM account_sessions WHERE token_hash=?").bind(await digest(token)).run();
      return reply({ ok: true }, 200, sessionCookie(request, "", 0));
    }
    const email = String(b2.email || "").trim().toLowerCase(), password = String(b2.password || "");
    if (["sendEmailCode", "verifyEmailCode"].includes(b2.action)) {
      if (!emailVerificationEnabled()) return reply({ error: "Email verification is waiting for the email provider setup. You can still use your password." }, 503);
      if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 150 || !["student", "teacher"].includes(b2.role)) return reply({ error: "Enter your registered email and choose the correct portal." }, 400);
      if (!await reserveAuthAttempt(request, email)) return reply({ error: "Too many attempts. Please wait 15 minutes and try again." }, 429);
      const existing = await env.DB.prepare("SELECT id,email,name,role FROM accounts WHERE email=?").bind(email).first();
      if (b2.action === "sendEmailCode") {
        if (b2.registering) {
          if (b2.role === "teacher") {
            const setupHash = env.CLASS_SYNC_TEACHER_SETUP_HASH;
            if (!setupHash || !equal(await digest(String(b2.setupCode || "")), setupHash) || await env.DB.prepare("SELECT id FROM accounts WHERE teacher_slot='classroom'").first()) return reply({ error: "Use the private teacher setup code, or sign in to the existing teacher account." }, 403);
          } else {
            const invite = await env.DB.prepare("SELECT s.email FROM account_invites i JOIN students s ON s.id=i.student_id WHERE i.token_hash=? AND i.expires>?").bind(await digest(String(b2.invite || "")), Date.now()).first();
            if (!invite || invite.email !== email) return reply({ error: "Use your teacher\u2019s valid invitation and its registered email." }, 403);
          }
        } else if (!existing || existing.role !== b2.role) return reply({ error: "Use an activated account in the matching portal." }, 403);
        try {
          await sendEmailCode(email);
          return reply({ ok: true, message: "Check your email for the verification code." });
        } catch (error) {
          return reply({ error: error instanceof Error ? error.message : "Email delivery failed." }, 502);
        }
      }
      try {
        const proof = await verifyEmailCode(email, String(b2.code || ""));
        if (b2.registering) return reply({ ok: true, emailProof: proof });
        if (!existing || existing.role !== b2.role) return reply({ error: "Use an activated account in the matching portal." }, 403);
        return reply({ ok: true, role: existing.role, redirect: existing.role === "teacher" ? "/teacher" : "/student" }, 200, await createSession(request, existing.id));
      } catch (error) {
        return reply({ error: error instanceof Error ? error.message : "Unable to verify email." }, 400);
      }
    }
    if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 150 || password.length < 10 || password.length > 128) return reply({ error: "Use a valid email and a password of 10\u2013128 characters." }, 400);
    const attempt = await reserveAuthAttempt(request, email);
    if (!attempt) return reply({ error: "Too many attempts. Please wait 15 minutes and try again." }, 429);
    let account;
    if (b2.action === "login") {
      account = await env.DB.prepare("SELECT * FROM accounts WHERE email=?").bind(email).first();
      const hash = await passwordHash(password, account?.salt || "classsync-dummy-password-salt", account?.iterations || 1e5);
      if (!account || !equal(account.password_hash, hash)) return reply({ error: "Email or password is incorrect." }, 401);
      if (b2.role && account.role !== b2.role) return reply({ error: "This account belongs to the other portal. Choose the matching role." }, 403);
    } else if (b2.action === "register") {
      if (emailVerificationEnabled()) {
        try {
          await verifyEmailProof(email, b2.emailProof);
        } catch (error) {
          return reply({ error: error instanceof Error ? error.message : "Verify your email first." }, 403);
        }
      }
      const name = String(b2.name || "").trim();
      if (!name || name.length > 60 || !["teacher", "student"].includes(b2.role)) return reply({ error: "Enter your name and a valid role." }, 400);
      const salt = randomToken(), hash = await passwordHash(password, salt), id = crypto.randomUUID();
      if (b2.role === "teacher") {
        const setupHash = env.CLASS_SYNC_TEACHER_SETUP_HASH;
        if (!setupHash || !equal(await digest(String(b2.setupCode || "")), setupHash)) return reply({ error: "A valid private teacher setup code is required." }, 403);
        if (await env.DB.prepare("SELECT id FROM accounts WHERE teacher_slot='classroom'").first()) return reply({ error: "The teacher account is already configured. Sign in instead." }, 409);
        try {
          await env.DB.batch([
            env.DB.prepare("INSERT INTO accounts (id,email,name,role,password_hash,salt,iterations,teacher_slot,created) VALUES (?,?,?,?,?,?,?,?,?)").bind(id, email, name, "teacher", hash, salt, 1e5, "classroom", Date.now()),
            env.DB.prepare("INSERT INTO workspace (id,owner) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET owner=excluded.owner").bind("classroom", id)
          ]);
        } catch {
          return reply({ error: "The teacher account or email is already registered." }, 409);
        }
        account = { id, email, name, role: "teacher" };
      } else {
        const tokenHash = await digest(String(b2.invite || ""));
        const invite = await env.DB.prepare("SELECT i.*,s.email FROM account_invites i JOIN students s ON s.id=i.student_id WHERE i.token_hash=? AND i.expires>?").bind(tokenHash, Date.now()).first();
        if (!invite || invite.email !== email) return reply({ error: "Use the unexpired invitation from your teacher and its registered email." }, 403);
        const existing = await env.DB.prepare("SELECT id,role FROM accounts WHERE email=?").bind(email).first();
        if (existing && existing.role !== "student") return reply({ error: "This email is already used by a teacher." }, 409);
        const accountId = existing?.id || id;
        const statements = [env.DB.prepare("INSERT INTO accounts (id,email,name,role,password_hash,salt,iterations,created) SELECT ?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM account_invites WHERE token_hash=? AND expires>?) ON CONFLICT(email) DO UPDATE SET name=excluded.name,password_hash=excluded.password_hash,salt=excluded.salt,iterations=excluded.iterations").bind(accountId, email, name, "student", hash, salt, 1e5, Date.now(), tokenHash, Date.now()), env.DB.prepare("DELETE FROM account_sessions WHERE account_id=? AND EXISTS (SELECT 1 FROM account_invites WHERE token_hash=? AND expires>?)").bind(accountId, tokenHash, Date.now()), env.DB.prepare("DELETE FROM account_invites WHERE token_hash=?").bind(tokenHash)];
        const result = await env.DB.batch(statements);
        if (!result[0].meta.changes) return reply({ error: "Invitation was already used. Request another from your teacher." }, 409);
        account = { id: accountId, email, name, role: "student" };
      }
    } else return reply({ error: "Unknown account action." }, 400);
    await env.DB.prepare("DELETE FROM auth_attempts WHERE id=?").bind(attempt).run();
    return reply({ ok: true, role: account.role, redirect: account.role === "teacher" ? "/teacher" : "/student" }, 200, await createSession(request, account.id));
  } catch (e) {
    console.error("Account request failed", e instanceof Error ? e.name : "Error");
    return reply({ error: "Unable to complete account request. Please retry." }, 503);
  }
}

// app/api/attendance/route.ts
var route_exports2 = {};
__export(route_exports2, {
  GET: () => GET2,
  POST: () => POST2,
  dynamic: () => dynamic2
});

// public/roster-core.js
var normalizeRoll = (value) => String(value ?? "").trim().toUpperCase();
function validateRosterRows(rows) {
  if (!Array.isArray(rows) || !rows.length || rows.length > 500) throw Error("Upload 1\u2013500 students at a time.");
  const seen = /* @__PURE__ */ new Set();
  return rows.map((r, i) => {
    const roll = normalizeRoll(r.roll), name = String(r.name ?? "").trim().replace(/\s+/g, " "), email = String(r.email ?? "").trim().toLowerCase();
    if (!/^[A-Z0-9][A-Z0-9._/-]{0,29}$/.test(roll)) throw Error("Row " + (i + 1) + ": use a valid roll number (letters, numbers, . _ / -).");
    if (seen.has(roll)) throw Error("Duplicate roll number: " + roll);
    seen.add(roll);
    if (name.length > 60 || /[\x00-\x1f]/.test(name)) throw Error("Row " + (i + 1) + ": name must be at most 60 characters.");
    if (email && (email.length > 150 || !/^\S+@\S+\.\S+$/.test(email) || email.endsWith("@roster.invalid"))) throw Error("Row " + (i + 1) + ": invalid email.");
    return { roll, name, email };
  });
}

// app/lib/attendance-requests.ts
function normalizeStudentName(value) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}
async function reviewAttendanceRequest(a, id, decision) {
  if (!["Approve", "Reject"].includes(decision)) throw Error("Choose Approve or Reject.");
  const request = await a.db.prepare("SELECT * FROM attendance_requests WHERE id=?").bind(id).first();
  if (!request) throw Error("Attendance request not found.");
  if (request.status !== "Pending") throw Error("This request has already been reviewed.");
  const now = Date.now();
  if (decision === "Reject") {
    const result = await a.db.prepare("UPDATE attendance_requests SET status='Rejected',reviewer=?,reviewed=? WHERE id=? AND status='Pending'").bind(a.user.userId, now, id).run();
    if (!result.meta.changes) throw Error("This request has already been reviewed.");
    return { ok: true, status: "Rejected", token: request.token };
  }
  const student = await a.db.prepare("SELECT id FROM students WHERE roll=?").bind(request.roll).first();
  if (!student) throw Error("Register this roll number in the student roster first, then approve this request.");
  if (request.account_id && request.student_id !== student.id) throw Error("This student registration changed. Reject the old request and ask the student to scan again.");
  const session = await a.db.prepare("SELECT token FROM sessions WHERE token=?").bind(request.token).first();
  if (!session) throw Error("The class session no longer exists.");
  const exists = "EXISTS (SELECT 1 FROM attendance_requests WHERE id=? AND status='Pending')";
  const results = await a.db.batch([
    a.db.prepare("INSERT INTO attendance (id,student_id,token,time,method) SELECT ?,?,?,?,? WHERE " + exists + " ON CONFLICT(student_id,token) DO NOTHING").bind(crypto.randomUUID(), student.id, request.token, request.created, "QR + teacher approval", id),
    // Approval confirms that a newly registered student was enrolled when they requested check-in.
    a.db.prepare("UPDATE students SET created_at=MIN(created_at,?) WHERE id=? AND " + exists).bind(request.created, student.id, id),
    a.db.prepare("INSERT INTO attendance_changes (id,student_id,token,status,teacher,time) SELECT ?,?,?,?,?,? WHERE " + exists).bind(crypto.randomUUID(), student.id, request.token, "Present", a.user.userId, now, id),
    a.db.prepare("INSERT INTO scan_events (id,token,student_id,actor,method,ip,status,reason,time) SELECT ?,?,?,?,?,?,?,?,? WHERE " + exists).bind(crypto.randomUUID(), request.token, student.id, a.user.userId, "qr", request.ip, "Accepted", "Teacher approved name/roll request", now, id),
    a.db.prepare("UPDATE attendance_requests SET status='Approved',student_id=?,reviewer=?,reviewed=? WHERE id=? AND status='Pending'").bind(student.id, a.user.userId, now, id)
  ]);
  if (!results.at(-1).meta.changes) throw Error("This request has already been reviewed.");
  return { ok: true, status: "Approved", token: request.token };
}
async function submitStudentAttendanceRequest(a, token, ip) {
  const deny = (message2, status = 400) => Object.assign(new Error(message2), { status });
  if (a.teacher || a.user.role !== "student") throw deny("Sign in with a student account to request attendance.", 403);
  const student = await a.db.prepare("SELECT id,name,roll FROM students WHERE email=?").bind(a.user.email.toLowerCase()).first();
  if (!student) throw deny("Your teacher must register your account email before you can request attendance.", 403);
  const session = await a.db.prepare("SELECT * FROM sessions WHERE token=?").bind(token).first();
  if (!session || session.mode !== "qr") throw deny("This QR class session was not found.", 404);
  if (!["approval", "manual"].includes(session.auth)) throw deny(session.auth === "direct" ? "Use the name-and-roll form for this session." : "Confirm attendance with your signed-in student account for this session.", 400);
  const existing = await a.db.prepare("SELECT id,status,account_id FROM attendance_requests WHERE token=? AND (account_id=? OR (roll=? AND normalized_name=?))").bind(token, a.user.userId, student.roll, normalizeStudentName(student.name)).first();
  const present = await a.db.prepare("SELECT id FROM attendance WHERE student_id=? AND token=?").bind(student.id, token).first();
  if (present) return { ok: true, requestStatus: "Approved", alreadyPresent: true, message: "Your attendance is already recorded." };
  if (existing?.account_id === a.user.userId) return { ok: true, requestStatus: existing.status, pending: existing.status === "Pending", message: existing.status === "Pending" ? "Request sent. Waiting for your teacher\u2019s approval. Attendance is not marked yet." : existing.status === "Rejected" ? "Your teacher rejected this request. Contact them if a correction is needed." : "Your request was approved. Ask your teacher if the attendance record needs correction." };
  if (!session.open || session.expires <= Date.now()) throw deny("The session is closed or expired. Ask your teacher for a new QR.", 410);
  if (session.require_ip && (!ip || !session.ip || ip !== session.ip)) throw deny("Your teacher requires matching IP. Connect to their internet connection and retry.", 403);
  const now = Date.now();
  const statements = [];
  if (existing) {
    if (existing.account_id && existing.account_id !== a.user.userId) throw deny("This request belongs to another account.", 403);
    if (existing.status === "Approved") return { ok: true, requestStatus: "Approved", message: "Your teacher already reviewed this class request." };
    statements.push(a.db.prepare("UPDATE attendance_requests SET account_id=?,student_id=?,name=?,normalized_name=?,ip=?,status='Pending',created=?,reviewer=NULL,reviewed=NULL WHERE id=? AND account_id IS NULL").bind(a.user.userId, student.id, student.name, normalizeStudentName(student.name), ip, now, existing.id));
  } else {
    statements.push(a.db.prepare("INSERT OR IGNORE INTO attendance_requests (id,account_id,token,name,normalized_name,roll,status,student_id,ip,created,receipt_hash) SELECT ?,?,?,?,?,?,'Pending',?,?,?,? WHERE EXISTS (SELECT 1 FROM sessions WHERE token=? AND open=1 AND expires>?)").bind(crypto.randomUUID(), a.user.userId, token, student.name, normalizeStudentName(student.name), student.roll, student.id, ip, now, await digest(randomToken()), token, now));
  }
  statements.push(a.db.prepare("INSERT INTO scan_events (id,token,student_id,actor,method,ip,status,reason,time) SELECT ?,?,?,?,?,?,'Pending',?,? WHERE EXISTS (SELECT 1 FROM attendance_requests WHERE token=? AND account_id=? AND status='Pending')").bind(crypto.randomUUID(), token, student.id, a.user.userId, "qr", ip, "Signed-in student requested teacher approval", now, token, a.user.userId));
  const results = await a.db.batch(statements);
  if (!results[0].meta.changes) {
    const row = await a.db.prepare("SELECT status FROM attendance_requests WHERE token=? AND account_id=?").bind(token, a.user.userId).first();
    if (!row) throw deny("The session closed while submitting. Refresh and retry.", 410);
    return { ok: true, requestStatus: row.status, pending: row.status === "Pending", message: "Your attendance request is " + row.status.toLowerCase() + "." };
  }
  return { ok: true, pending: true, requestStatus: "Pending", message: "Request sent. Waiting for your teacher\u2019s approval. Attendance is not marked yet." };
}

// public/liveness-core.js
function evaluateLiveness(samples, order, direction) {
  if (!Array.isArray(samples) || samples.length > 100 || !["blink-turn", "turn-blink"].includes(order) || ![-1, 1].includes(direction)) throw Error("Invalid liveness evidence.");
  let previous = -1;
  for (const s of samples) {
    if (!s || !Number.isFinite(s.t) || s.t < 0 || s.t > 25e3 || previous >= 0 && (s.t - previous < 80 || s.t - previous > 2e3) || !Number.isFinite(s.ear) || s.ear < 0 || s.ear > 1 || !Number.isFinite(s.yaw) || Math.abs(s.yaw) > 1) throw Error("Interrupted or invalid liveness capture. Retry with a clear camera view.");
    previous = s.t;
  }
  const stages = order === "blink-turn" ? ["blink", "turn"] : ["turn", "blink"];
  const neutral = samples.slice(0, 3);
  if (neutral.length < 3 || neutral.some((s) => s.ear < 0.18 || Math.abs(s.yaw) > 0.16)) return { complete: false, progress: 0, stage: "calibrate", message: "Look straight at the camera with both eyes open." };
  const eye = neutral.reduce((n, s) => n + s.ear, 0) / 3;
  const yaw = neutral.reduce((n, s) => n + s.yaw, 0) / 3;
  let stageIndex = 0, phase = 0, consecutive = 0;
  for (const s of samples.slice(3)) {
    if (stageIndex === stages.length) break;
    if (stages[stageIndex] === "blink") {
      if (phase === 0 && s.ear < eye * 0.62) {
        phase = 1;
        consecutive = 0;
      } else if (phase === 1) {
        consecutive = s.ear > eye * 0.85 ? consecutive + 1 : 0;
        if (consecutive >= 2) {
          stageIndex++;
          phase = 0;
          consecutive = 0;
        }
      }
    } else if (phase === 0) {
      consecutive = direction * (s.yaw - yaw) >= 0.14 && s.ear > eye * 0.6 ? consecutive + 1 : 0;
      if (consecutive >= 2) {
        phase = 1;
        consecutive = 0;
      }
    } else {
      consecutive = Math.abs(s.yaw - yaw) < 0.07 && s.ear > eye * 0.85 ? consecutive + 1 : 0;
      if (consecutive >= 2) {
        stageIndex++;
        phase = 0;
        consecutive = 0;
      }
    }
  }
  const complete = stageIndex === stages.length;
  const stage = complete ? "complete" : stages[stageIndex];
  return { complete, progress: 1 + stageIndex, stage, message: complete ? "Motion challenge passed." : stage === "blink" ? phase ? "Open both eyes and hold still." : "Close both eyes for about one second, then open them." : phase ? "Return to the centre and look straight ahead." : `Slowly turn your nose toward the ${direction === -1 ? "LEFT" : "RIGHT"} edge of the camera image.` };
}
function faceDistance(a, b2) {
  if (!Array.isArray(a) || !Array.isArray(b2) || a.length !== 128 || b2.length !== 128 || [...a, ...b2].some((n) => !Number.isFinite(n) || Math.abs(n) >= 10)) return Infinity;
  return Math.sqrt(a.reduce((n, x, i) => n + (x - b2[i]) ** 2, 0));
}

// app/lib/liveness.ts
async function issueLiveness(a, token, purpose, studentId) {
  if (!["checkin", "enroll"].includes(purpose)) throw Error("Choose a valid liveness purpose.");
  const session = await a.db.prepare("SELECT * FROM sessions WHERE token=?").bind(token).first();
  if (!session || session.mode !== "face" || !session.open || session.expires <= Date.now()) throw Error("Create an active face session before starting liveness.");
  if (purpose === "enroll" && !await a.db.prepare("SELECT id FROM students WHERE id=?").bind(studentId).first()) throw Error("Select a registered student.");
  const random = new Uint8Array(2);
  crypto.getRandomValues(random);
  const challenge = { nonce: crypto.randomUUID(), order: random[0] % 2 ? "blink-turn" : "turn-blink", direction: random[1] % 2 ? 1 : -1, expires: Math.min(Date.now() + 9e4, session.expires) };
  await a.db.batch([
    a.db.prepare("DELETE FROM liveness_challenges WHERE actor=? OR expires<?").bind(a.user.userId, Date.now()),
    a.db.prepare("INSERT INTO liveness_challenges (nonce,actor,token,purpose,student_id,challenge_order,direction,created,expires,used) VALUES (?,?,?,?,?,?,?,?,?,0)").bind(challenge.nonce, a.user.userId, token, purpose, studentId, challenge.order, challenge.direction, Date.now(), challenge.expires)
  ]);
  return challenge;
}
async function consumeLiveness(a, proof, token, purpose, studentId, descriptors) {
  if (!proof || typeof proof.nonce !== "string") throw Error("Complete the live camera challenge first.");
  const row = await a.db.prepare("SELECT * FROM liveness_challenges WHERE nonce=?").bind(proof.nonce).first();
  if (!row || row.actor !== a.user.userId || row.token !== token || row.purpose !== purpose || row.student_id !== studentId || row.used || row.expires <= Date.now()) throw Error("Liveness challenge expired, used or mismatched. Retry the camera challenge.");
  const session = await a.db.prepare("SELECT * FROM sessions WHERE token=?").bind(token).first();
  if (!session || !session.open || session.mode !== "face" || session.expires <= Date.now()) throw Error("Face session closed or expired. Start a fresh session.");
  const status = evaluateLiveness(proof.samples, row.challenge_order, row.direction);
  if (!status.complete || proof.samples.length < 10 || proof.samples.at(-1).t > Date.now() - row.created + 1e3) throw Error("Liveness steps were not completed in order. Retry.");
  if (faceDistance(proof.startDescriptor, proof.endDescriptor) > 0.45 || !descriptors.length || descriptors.some((d) => faceDistance(d, proof.endDescriptor) > 0.5)) throw Error("Face changed between capture and liveness. Recapture the same person.");
  const result = await a.db.prepare("UPDATE liveness_challenges SET used=1 WHERE nonce=? AND used=0 AND expires>?").bind(proof.nonce, Date.now()).run();
  if (!result.meta.changes) throw Error("Liveness challenge was already used. Retry.");
}

// app/api/attendance/route.ts
var dynamic2 = "force-dynamic";
var answer = (body, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
var fail = (message2, status = 400) => answer({ error: message2 }, status);
var descriptor = (v) => Array.isArray(v) && v.length === 128 && v.every((x) => typeof x === "number" && Number.isFinite(x) && Math.abs(x) < 10);
async function auth(request) {
  const user = await getAccountUser(request);
  if (!user) return null;
  const db = env.DB;
  if (!db) throw Error("Database binding missing");
  const w = await db.prepare("SELECT owner,target,critical FROM workspace WHERE id=?").bind("classroom").first();
  return { user, db, teacher: user.role === "teacher" && w?.owner === user.userId, policy: { target: w?.target ?? 75, critical: w?.critical ?? 65 } };
}
async function publishWarnings(db, policy, token) {
  const session = await db.prepare("SELECT * FROM sessions WHERE token=?").bind(token).first();
  if (!session) return;
  const now = Date.now();
  const students = (await db.prepare("SELECT s.id,s.name,s.email,s.parent_email,COUNT(c.token) AS held,COUNT(a.id) AS present FROM students s LEFT JOIN sessions c ON c.subject=? AND c.expires>=s.created_at AND (c.open=0 OR c.expires<=?) LEFT JOIN attendance a ON a.student_id=s.id AND a.token=c.token GROUP BY s.id").bind(session.subject, now).all()).results;
  const statements = [];
  for (const student of students) {
    if (!student.held) continue;
    const pct = 100 * Number(student.present || 0) / Number(student.held);
    if (pct >= policy.target) continue;
    const subject = (pct < policy.critical ? "Critical attendance warning" : "Attendance needs attention") + " \u2014 " + session.subject;
    const body = student.name + " has " + pct.toFixed(2) + "% attendance in " + session.subject + " (" + student.present + "/" + student.held + " completed classes). The target is " + policy.target + "%. This update follows the class dated " + (session.class_date || new Date(session.expires).toISOString().slice(0, 10)) + ". Please review daily attendance and the recovery plan, and contact the teacher if a correction or support is needed.";
    for (const audience of ["student", "parent"]) {
      const email = audience === "parent" ? student.parent_email : student.email;
      if (!email) continue;
      statements.push(db.prepare("INSERT OR IGNORE INTO messages (id,student_id,audience,recipient_email,subject,body,created,read_at,email_status,delivery_detail,alert_key) VALUES (?,?,?,?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(), student.id, audience, email, subject, body, now, null, audience === "parent" ? "Pending email" : "Portal only", audience === "parent" ? "Saved in teacher history; parent email delivery requires configuration" : "Automatic attendance warning saved to student portal", "attendance:" + token + ":" + student.id + ":" + audience));
    }
  }
  if (statements.length) await db.batch(statements);
}
async function GET2(request) {
  try {
    request = await proxyRequest(request);
    const a = await auth(request);
    if (!a) return fail("Sign in to access attendance.", 401);
    const url = new URL(request.url), token = url.searchParams.get("token");
    if (url.searchParams.get("portal") === "parent") return fail("Parent login has been removed. Use the student or teacher login.", 403);
    const parent = false;
    const teacher2 = a.teacher && !["student", "parent"].includes(url.searchParams.get("portal") || "");
    const emailColumn = parent ? "parent_email" : "email";
    const session = token ? await a.db.prepare("SELECT * FROM sessions WHERE token=?").bind(token).first() : await a.db.prepare("SELECT * FROM sessions ORDER BY rowid DESC LIMIT 1").first();
    const students = teacher2 ? (await a.db.prepare("SELECT * FROM students ORDER BY name").all()).results : (await a.db.prepare("SELECT id,name,roll,email,parent_email,created_at FROM students WHERE " + emailColumn + "=?").bind(a.user.email.toLowerCase()).all()).results;
    const records = teacher2 ? (await a.db.prepare("SELECT a.*,s.name,s.roll,s.email,c.subject,c.room FROM attendance a JOIN students s ON s.id=a.student_id JOIN sessions c ON c.token=a.token ORDER BY a.time DESC").all()).results : (await a.db.prepare("SELECT a.*,s.name,s.roll,s.email,c.subject,c.room FROM attendance a JOIN students s ON s.id=a.student_id JOIN sessions c ON c.token=a.token WHERE s." + emailColumn + "=? ORDER BY a.time DESC").bind(a.user.email.toLowerCase()).all()).results;
    const sessions = (await a.db.prepare("SELECT token,subject,room,mode,auth,expires,open,class_date FROM sessions ORDER BY rowid DESC").all()).results;
    const lessons = (await a.db.prepare("SELECT * FROM lessons ORDER BY rowid DESC").all()).results;
    const progress = teacher2 ? (await a.db.prepare("SELECT * FROM learning_progress").all()).results : (await a.db.prepare("SELECT p.* FROM learning_progress p JOIN students s ON s.id=p.student_id WHERE s." + emailColumn + "=?").bind(a.user.email.toLowerCase()).all()).results;
    const scans = teacher2 ? (await a.db.prepare("SELECT e.*,s.name,s.roll FROM scan_events e LEFT JOIN students s ON s.id=e.student_id ORDER BY e.time DESC LIMIT 100").all()).results : (await a.db.prepare("SELECT e.*,s.name,s.roll FROM scan_events e LEFT JOIN students s ON s.id=e.student_id WHERE e.actor=? ORDER BY e.time DESC LIMIT 100").bind(a.user.userId).all()).results;
    const approvalRequests = teacher2 ? (await a.db.prepare("SELECT r.id,r.account_id,r.token,r.name,r.roll,r.status,r.student_id,r.ip,r.created,r.reviewed,c.subject,c.room,c.class_date,s.name AS registered_name FROM attendance_requests r JOIN sessions c ON c.token=r.token LEFT JOIN students s ON s.roll=r.roll ORDER BY r.created DESC").all()).results : [];
    const myAttendanceRequests = !teacher2 ? (await a.db.prepare("SELECT id,token,status,created,reviewed FROM attendance_requests WHERE account_id=? ORDER BY created DESC").bind(a.user.userId).all()).results : [];
    const detectedIp = request.headers.get("cf-connecting-ip") || "";
    const connection4 = { currentIp: detectedIp, required: !!session?.require_ip, matches: !session?.require_ip || !!session?.ip && detectedIp === session.ip };
    const changes = teacher2 ? (await a.db.prepare("SELECT * FROM attendance_changes ORDER BY time DESC LIMIT 100").all()).results : [];
    const messages2 = teacher2 ? (await a.db.prepare("SELECT m.*,s.name,s.roll FROM messages m JOIN students s ON s.id=m.student_id ORDER BY m.created DESC LIMIT 200").all()).results : (await a.db.prepare("SELECT m.*,s.name,s.roll FROM messages m JOIN students s ON s.id=m.student_id WHERE s." + emailColumn + "=? AND m.audience=? ORDER BY m.created DESC LIMIT 100").bind(a.user.email.toLowerCase(), parent ? "parent" : "student").all()).results;
    return answer({ myAttendanceRequests, approvalRequests, attendancePolicy: a.policy, messages: messages2, emailReady: !!env.BREVO_API_KEY && !!env.MAIL_FROM_EMAIL, parent, changes, students, sessions, lessons, progress, scans, connection: connection4, session: session ? { ...session, ip: void 0 } : null, records, user: { email: a.user.email, name: a.user.displayName, teacher: teacher2 } });
  } catch (e) {
    console.error(e);
    return fail("Attendance service unavailable. Please refresh or retry.", 503);
  }
}
async function POST2(request) {
  try {
    request = await proxyRequest(request);
    const a = await auth(request);
    if (!a) return fail("Sign in to continue.", 401);
    if (request.headers.get("origin") !== new URL(request.url).origin) return fail("Request origin rejected.", 403);
    const raw = await request.text();
    if (raw.length > 15e4) return fail("Request too large.", 413);
    const b2 = JSON.parse(raw);
    if (!b2 || typeof b2 !== "object" || Array.isArray(b2)) return fail("Send a JSON action object.");
    const action = b2.action;
    if (["sessionIp", "reviewAttendance", "studentInvite", "rosterImport", "livenessChallenge", "student", "session", "close", "enroll", "deleteFace", "deleteStudent", "lesson", "deleteLesson", "attendanceUpdate", "message", "parentContact", "targetSettings"].includes(action) && !a.teacher) return fail("Teacher permission required.", 403);
    if (action === "requestAttendance") {
      try {
        return answer(await submitStudentAttendanceRequest(a, String(b2.token || ""), request.headers.get("cf-connecting-ip") || ""));
      } catch (e) {
        return fail(e.message, e.status || 400);
      }
    }
    if (action === "sessionIp") {
      if (typeof b2.requireIp !== "boolean") return fail("Choose whether IP matching is required.");
      const ip = request.headers.get("cf-connecting-ip");
      if (b2.requireIp && !ip) return fail("Teacher public IP is unavailable.");
      const result = await a.db.prepare("UPDATE sessions SET require_ip=?,ip=? WHERE token=? AND open=1 AND expires>?").bind(b2.requireIp ? 1 : 0, ip, String(b2.token || ""), Date.now()).run();
      if (!result.meta.changes) return fail("The session is closed or expired.", 410);
      return answer({ ok: true });
    }
    if (action === "reviewAttendance") {
      try {
        const result = await reviewAttendanceRequest(a, String(b2.requestId || ""), String(b2.decision || ""));
        return answer(result);
      } catch (e) {
        return fail(e.message, 409);
      }
    }
    if (action === "studentInvite") {
      const student = await a.db.prepare("SELECT id,email FROM students WHERE id=?").bind(String(b2.studentId || "")).first();
      if (!student) return fail("Select a registered student.", 404);
      if (student.email.endsWith("@roster.invalid")) return fail("This student was registered without an email. Use the class face-enrollment QR; a dashboard login requires a registered email.");
      const invite = await issueStudentInvite(student.id);
      return answer({ ok: true, inviteUrl: new URL("/student-login?invite=" + invite + "&email=" + encodeURIComponent(student.email), request.url).href });
    }
    if (action === "livenessChallenge") {
      try {
        return answer(await issueLiveness(a, String(b2.token || ""), String(b2.purpose || ""), String(b2.studentId || "")));
      } catch (e) {
        return fail(e.message, 400);
      }
    }
    if (action === "rosterImport") {
      let rows;
      try {
        rows = validateRosterRows(b2.rows);
      } catch (e) {
        return fail(e.message);
      }
      const existing = (await a.db.prepare("SELECT id,name,roll,email FROM students").all()).results;
      const byRoll = new Map(existing.map((s) => [normalizeRoll(s.roll), s]));
      if (byRoll.size !== existing.length) return fail("Existing roll numbers conflict when capitalized. Resolve them before importing.", 409);
      const emails = /* @__PURE__ */ new Set(), statements = [];
      let added = 0, linked = 0;
      for (const r of rows) {
        const s = byRoll.get(r.roll);
        if (s && (r.name && r.name.toLowerCase().replace(/\s+/g, " ") !== s.name.toLowerCase().replace(/\s+/g, " ") && !s.email.endsWith("@roster.invalid") || r.email && r.email !== s.email)) return fail("Details conflict with existing student " + r.roll + ". Existing records were preserved.", 409);
        const email = s?.email || r.email || crypto.randomUUID() + "@roster.invalid";
        if (emails.has(email) || existing.some((x) => x.email === email && x.id !== s?.id)) return fail("Email already belongs to another roll: " + email, 409);
        emails.add(email);
        const id = s?.id || crypto.randomUUID();
        if (!s) {
          added++;
          statements.push(a.db.prepare("INSERT INTO students (id,name,roll,email,created_at,parent_email) VALUES (?,?,?,?,?,?)").bind(id, r.name || "Name awaiting verification", r.roll, email, Date.now(), ""));
        } else linked++;
        statements.push(a.db.prepare("INSERT INTO registration_roster (student_id,roll,expected_name,owner,created) VALUES (?,?,?,?,?) ON CONFLICT(student_id) DO UPDATE SET owner=excluded.owner").bind(id, r.roll, r.name || (s && !s.email.endsWith("@roster.invalid") ? s.name : ""), a.user.userId, Date.now()));
      }
      await a.db.batch(statements);
      return answer({ ok: true, added, linked, total: rows.length });
    }
    if (action === "student") {
      const name = String(b2.name || "").trim(), roll = String(b2.roll || "").trim(), email = String(b2.email || "").trim().toLowerCase(), parentEmail = String(b2.parentEmail || "").trim().toLowerCase();
      if (parentEmail && !/^\S+@\S+\.\S+$/.test(parentEmail)) return fail("Enter a valid parent email.");
      if (!name || name.length > 60 || !roll || roll.length > 30 || !/^\S+@\S+\.\S+$/.test(email) || email.length > 150) return fail("Enter a name, roll number and valid email.");
      try {
        await a.db.prepare("INSERT INTO students (id,name,roll,email,created_at,parent_email) VALUES (?,?,?,?,?,?)").bind(crypto.randomUUID(), name, roll, email, Date.now(), parentEmail).run();
      } catch {
        return fail("This roll number or email is already registered.", 409);
      }
      return answer({ ok: true });
    }
    if (action === "session") {
      const subject = String(b2.subject || "").trim(), room = String(b2.room || "").trim(), duration = Number(b2.duration);
      if (!subject || subject.length > 120 || !room || room.length > 60 || !Number.isInteger(duration) || duration < 15 || duration > 3600 || !["qr", "face"].includes(b2.mode) || !["approval", "direct", "manual", "account"].includes(b2.auth)) return fail("Invalid session settings.");
      if (b2.requireIp !== void 0 && typeof b2.requireIp !== "boolean") return fail("Choose a valid IP matching setting.");
      const classDate = String(b2.classDate || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10));
      if (!/^\d{4}-\d{2}-\d{2}$/.test(classDate) || isNaN(Date.parse(classDate + "T12:00:00Z"))) return fail("Enter a valid class date.");
      const token = crypto.randomUUID();
      await a.db.batch([a.db.prepare("UPDATE sessions SET open=0 WHERE open=1"), a.db.prepare("INSERT INTO sessions (token,subject,room,mode,auth,expires,open,ip,require_ip,class_date) VALUES (?,?,?,?,?,?,?,?,?,?)").bind(token, subject, room, b2.mode, b2.auth, Date.now() + duration * 1e3, 1, request.headers.get("cf-connecting-ip"), b2.requireIp === false ? 0 : 1, classDate)]);
      return answer({ ok: true, token });
    }
    if (action === "close") {
      await a.db.prepare("UPDATE sessions SET open=0 WHERE token=?").bind(String(b2.token || "")).run();
      await publishWarnings(a.db, a.policy, String(b2.token || ""));
      return answer({ ok: true });
    }
    if (action === "enroll") {
      if (!b2.consent || !Array.isArray(b2.descriptors) || b2.descriptors.length < 2 || b2.descriptors.length > 3 || !b2.descriptors.every(descriptor)) return fail("Consent and at least two valid face captures are required.");
      const s = await a.db.prepare("SELECT id FROM students WHERE id=?").bind(String(b2.studentId || "")).first();
      if (!s) return fail("Student not found.", 404);
      try {
        await consumeLiveness(a, b2.liveness, String(b2.token || ""), "enroll", String(s.id), b2.descriptors);
      } catch (e) {
        return fail(e.message, 403);
      }
      await a.db.prepare("UPDATE students SET descriptors=? WHERE id=?").bind(JSON.stringify(b2.descriptors), s.id).run();
      return answer({ ok: true });
    }
    if (action === "deleteFace") {
      await a.db.batch([a.db.prepare("UPDATE students SET descriptors=NULL WHERE id=?").bind(String(b2.studentId || "")), a.db.prepare("UPDATE face_enrollment_requests SET descriptors=NULL,status='Revoked' WHERE scope='live' AND student_id=?").bind(String(b2.studentId || ""))]);
      return answer({ ok: true });
    }
    if (action === "deleteStudent") {
      await a.db.batch([a.db.prepare("DELETE FROM face_enrollment_requests WHERE scope='live' AND student_id=?").bind(String(b2.studentId || "")), a.db.prepare("DELETE FROM account_sessions WHERE account_id IN (SELECT id FROM accounts WHERE role=? AND email IN (SELECT email FROM students WHERE id=?))").bind("student", String(b2.studentId || "")), a.db.prepare("DELETE FROM accounts WHERE role=? AND email IN (SELECT email FROM students WHERE id=?)").bind("student", String(b2.studentId || "")), a.db.prepare("DELETE FROM account_invites WHERE student_id=?").bind(String(b2.studentId || "")), a.db.prepare("DELETE FROM messages WHERE student_id=?").bind(String(b2.studentId || "")), a.db.prepare("DELETE FROM attendance_changes WHERE student_id=?").bind(String(b2.studentId || "")), a.db.prepare("DELETE FROM learning_progress WHERE student_id=?").bind(String(b2.studentId || "")), a.db.prepare("DELETE FROM attendance WHERE student_id=?").bind(String(b2.studentId || "")), a.db.prepare("DELETE FROM registration_roster WHERE student_id=?").bind(String(b2.studentId || "")), a.db.prepare("DELETE FROM students WHERE id=?").bind(String(b2.studentId || ""))]);
      return answer({ ok: true });
    }
    if (action === "lesson") {
      const token = String(b2.token || ""), topic = String(b2.topic || "").trim(), task = String(b2.task || "").trim(), resource = String(b2.resource || "").trim(), due = String(b2.due || "");
      if (!topic || topic.length > 120 || !task || task.length > 1e3 || resource.length > 2e3 || due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) return fail("Enter a topic and learning task with valid field lengths.");
      if (resource) {
        try {
          if (!["http:", "https:"].includes(new URL(resource).protocol)) return fail("Use an http or https resource link.");
        } catch {
          return fail("Enter a valid resource URL.");
        }
      }
      const session = await a.db.prepare("SELECT token FROM sessions WHERE token=?").bind(token).first();
      if (!session) return fail("Choose an existing class session.", 404);
      await a.db.prepare("INSERT INTO lessons (id,token,topic,task,resource,due) VALUES (?,?,?,?,?,?)").bind(crypto.randomUUID(), token, topic, task, resource, due).run();
      return answer({ ok: true });
    }
    if (action === "deleteLesson") {
      await a.db.batch([a.db.prepare("DELETE FROM learning_progress WHERE lesson_id=?").bind(String(b2.lessonId || "")), a.db.prepare("DELETE FROM lessons WHERE id=?").bind(String(b2.lessonId || ""))]);
      return answer({ ok: true });
    }
    if (action === "progress") {
      if (typeof b2.done !== "boolean") return fail("Completion must be true or false.");
      const student = await a.db.prepare("SELECT id,email FROM students WHERE id=?").bind(String(b2.studentId || "")).first();
      if (!student) return fail("Student not found.", 404);
      if (!a.teacher && student.email !== a.user.email.toLowerCase()) return fail("You may only update your own learning progress.", 403);
      const lesson = await a.db.prepare("SELECT id FROM lessons WHERE id=?").bind(String(b2.lessonId || "")).first();
      if (!lesson) return fail("Lesson not found.", 404);
      await a.db.prepare("INSERT INTO learning_progress (id,student_id,lesson_id,done,updated) VALUES (?,?,?,?,?) ON CONFLICT(student_id,lesson_id) DO UPDATE SET done=excluded.done,updated=excluded.updated").bind(crypto.randomUUID(), student.id, lesson.id, b2.done ? 1 : 0, Date.now()).run();
      return answer({ ok: true });
    }
    if (action === "attendanceUpdate") {
      const token = String(b2.token || "");
      const session = await a.db.prepare("SELECT token FROM sessions WHERE token=?").bind(token).first();
      if (!session) return fail("Select an existing class session.", 404);
      if (!Array.isArray(b2.rows) || !b2.rows.length || b2.rows.length > 500) return fail("Provide 1 to 500 attendance rows.");
      const seen = /* @__PURE__ */ new Set();
      const updates = [];
      const roster2 = (await a.db.prepare("SELECT id,roll,created_at FROM students").all()).results;
      const studentMap = new Map(roster2.map((s) => [s.roll, s]));
      for (const row of b2.rows) {
        const roll = String(row.roll || "").trim();
        if (!roll || seen.has(roll) || !["Present", "Absent"].includes(row.status)) return fail("Use unique roll numbers with Present or Absent status.");
        seen.add(roll);
        const student = studentMap.get(roll);
        if (!student) return fail("Unknown roll number: " + roll + ". Register this student before uploading.");
        updates.push({ studentId: student.id, status: row.status });
      }
      const now = Date.now(), statements = [];
      for (const u of updates) {
        if (u.status === "Present") statements.push(a.db.prepare("INSERT INTO attendance (id,student_id,token,time,method) VALUES (?,?,?,?,?) ON CONFLICT(student_id,token) DO UPDATE SET time=excluded.time,method=excluded.method").bind(crypto.randomUUID(), u.studentId, token, now, "Teacher update"));
        else statements.push(a.db.prepare("DELETE FROM attendance WHERE student_id=? AND token=?").bind(u.studentId, token));
        statements.push(a.db.prepare("INSERT INTO attendance_changes (id,student_id,token,status,teacher,time) VALUES (?,?,?,?,?,?)").bind(crypto.randomUUID(), u.studentId, token, u.status, a.user.userId, now));
      }
      statements.push(a.db.prepare("UPDATE sessions SET open=0 WHERE token=?").bind(token));
      await a.db.batch(statements);
      await publishWarnings(a.db, a.policy, token);
      return answer({ ok: true, updated: updates.length });
    }
    if (action === "targetSettings") {
      const target = Number(b2.target), critical = Number(b2.critical);
      if (!Number.isFinite(target) || !Number.isFinite(critical) || target <= 0 || target > 100 || critical < 0 || critical > target) return fail("Enter valid attendance thresholds.");
      await a.db.prepare("UPDATE workspace SET target=?,critical=? WHERE id=?").bind(target, critical, "classroom").run();
      return answer({ ok: true });
    }
    if (action === "parentContact") {
      const email = String(b2.email || "").trim().toLowerCase();
      if (email && !/^\S+@\S+\.\S+$/.test(email)) return fail("Enter a valid parent email.");
      await a.db.prepare("UPDATE students SET parent_email=? WHERE id=?").bind(email, String(b2.studentId || "")).run();
      return answer({ ok: true });
    }
    if (action === "message") {
      const student = await a.db.prepare("SELECT id,name,email,parent_email FROM students WHERE id=?").bind(String(b2.studentId || "")).first();
      if (!student) return fail("Select a registered student.", 404);
      const subject = String(b2.subject || "").trim(), body = String(b2.body || "").trim();
      if (!subject || subject.length > 150 || !body || body.length > 2e3 || !["student", "parent", "both"].includes(b2.audience)) return fail("Enter a subject, message and valid audience.");
      if (["parent", "both"].includes(b2.audience) && !student.parent_email) return fail("Save a parent email for this student before sending to parents.");
      const audiences = b2.audience === "both" ? ["student", "parent"] : [b2.audience];
      const rows = audiences.map((audience) => ({ id: crypto.randomUUID(), audience, email: audience === "parent" ? student.parent_email : student.email }));
      await a.db.batch(rows.map((r) => a.db.prepare("INSERT INTO messages (id,student_id,audience,recipient_email,subject,body,created,read_at,email_status,delivery_detail) VALUES (?,?,?,?,?,?,?,?,?,?)").bind(r.id, student.id, r.audience, r.email, subject, body, Date.now(), null, r.audience === "parent" ? "Pending email" : "Portal only", r.audience === "parent" ? "Saved in teacher history; parent email not submitted" : "Saved to student portal")));
      let sent = 0, failed = 0;
      for (const r of rows) {
        if (!b2.sendEmail) continue;
        if (!env.BREVO_API_KEY || !env.MAIL_FROM_EMAIL) {
          await a.db.prepare("UPDATE messages SET email_status=?,delivery_detail=? WHERE id=?").bind("Not configured", "Email service is not configured. Message saved in teacher history.", r.id).run();
          continue;
        }
        try {
          const response = await fetch("https://api.brevo.com/v3/smtp/email", { method: "POST", headers: { "api-key": env.BREVO_API_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ sender: { name: "ClassSync", email: env.MAIL_FROM_EMAIL }, to: [{ email: r.email }], subject, textContent: body + (r.audience === "parent" ? "\n\nPlease contact the teacher for attendance questions." : "\n\nView your attendance: " + new URL(request.url).origin + "/student") }) });
          if (!response.ok) throw Error("Email provider returned " + response.status);
          await a.db.prepare("UPDATE messages SET email_status=?,delivery_detail=? WHERE id=?").bind("Submitted", "Email accepted by provider; inbox delivery is not confirmed.", r.id).run();
          sent++;
        } catch {
          failed++;
          await a.db.prepare("UPDATE messages SET email_status=?,delivery_detail=? WHERE id=?").bind("Failed", "Email submission failed. Message remains in teacher history.", r.id).run();
        }
      }
      return answer({ ok: true, portalMessages: rows.filter((r) => r.audience === "student").length, storedMessages: rows.length, submittedEmails: sent, failedEmails: failed, emailConfigured: !!env.BREVO_API_KEY && !!env.MAIL_FROM_EMAIL });
    }
    if (action === "readMessage") {
      const m = await a.db.prepare("SELECT m.*,s.email,s.parent_email FROM messages m JOIN students s ON s.id=m.student_id WHERE m.id=?").bind(String(b2.messageId || "")).first();
      if (!m) return fail("Message not found.", 404);
      const recipient = m.audience === "parent" ? m.parent_email : m.email;
      if (!a.teacher && recipient !== a.user.email.toLowerCase()) return fail("You can only mark your own messages read.", 403);
      if (a.teacher && recipient !== a.user.email.toLowerCase()) return fail("Only the recipient can acknowledge this message.", 403);
      await a.db.prepare("UPDATE messages SET read_at=? WHERE id=?").bind(Date.now(), m.id).run();
      return answer({ ok: true });
    }
    if (action === "checkin") {
      let auditStudent = null;
      const ip = request.headers.get("cf-connecting-ip") || "";
      const audit = async (status, reason) => {
        await a.db.prepare("INSERT INTO scan_events (id,token,student_id,actor,method,ip,status,reason,time) VALUES (?,?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(), String(b2.token || "").slice(0, 100), auditStudent, a.user.userId, String(b2.descriptor ? "face" : "qr"), ip, status, reason, Date.now()).run();
      };
      const deny = async (message2, status = 400) => {
        await audit("Rejected", message2);
        return fail(message2, status);
      };
      const session = await a.db.prepare("SELECT * FROM sessions WHERE token=?").bind(String(b2.token || "")).first();
      if (!session || !session.open || Date.now() >= session.expires) return deny("Session missing, closed or expired. Ask the teacher to create a new session.", 410);
      if (session.mode === "qr" && (session.auth === "approval" || !a.teacher && session.auth !== "account")) return deny("Submit a student attendance request and wait for teacher approval.", 403);
      if (session.mode === "qr" && session.auth === "account" && a.teacher) return deny("Students must confirm with their own signed-in account. Use the student QR link.", 403);
      if (session.require_ip && (!ip || !session.ip || ip !== session.ip)) return deny("Connection check failed: public IP differs from the teacher\u2019s connection.", 403);
      let s;
      let method;
      if (session.mode === "face") {
        if (!a.teacher) return deny("Face matching is operated by the teacher on the classroom device.", 403);
        if (!descriptor(b2.descriptor)) return deny("Capture a clear face first.");
        try {
          await consumeLiveness(a, b2.liveness, session.token, "checkin", "", [b2.descriptor]);
        } catch (e) {
          return deny(e.message, 403);
        }
        const all = (await a.db.prepare("SELECT * FROM students WHERE descriptors IS NOT NULL").all()).results;
        let candidates = [];
        for (const student of all) {
          const ds = JSON.parse(String(student.descriptors));
          const distances = ds.map((d) => Math.sqrt(d.reduce((sum, x, i) => sum + (x - b2.descriptor[i]) ** 2, 0)));
          candidates.push({ student, distance: distances.reduce((x, y) => x + y, 0) / distances.length });
        }
        candidates.sort((x, y) => x.distance - y.distance);
        if (!candidates.length) return deny("Enroll a student\u2019s face before scanning.");
        if (candidates[0].distance > 0.5) return deny("Unknown face: no enrolled student matches.");
        if (candidates[1] && candidates[1].distance - candidates[0].distance < 0.06) return deny("Ambiguous face match. Move closer and recapture.");
        s = candidates[0].student;
        method = "Face + motion challenge";
      } else if (session.auth === "account") {
        s = await a.db.prepare("SELECT * FROM students WHERE email=?").bind(a.user.email.toLowerCase()).first();
        method = "QR + signed-in email";
        if (!s) return deny("Your signed-in email is not registered. Ask the teacher to register " + a.user.email + ".", 403);
      } else {
        if (!a.teacher) return deny("Teacher-assisted sessions must be checked in by the teacher.", 403);
        s = await a.db.prepare("SELECT * FROM students WHERE id=?").bind(String(b2.studentId || "")).first();
        method = "QR + teacher confirmation";
        if (!s) return deny("Select a registered student.");
      }
      auditStudent = String(s.id);
      const now = Date.now();
      try {
        const result = await a.db.prepare("INSERT INTO attendance (id,student_id,token,time,method) SELECT ?,?,?,?,? WHERE EXISTS (SELECT 1 FROM sessions WHERE token=? AND open=1 AND expires>?)").bind(crypto.randomUUID(), s.id, session.token, now, method, session.token, now).run();
        if (!result.meta.changes) return deny("Session expired or closed while checking in.", 410);
      } catch (e) {
        if (String(e).includes("UNIQUE")) return deny("Already present: duplicate attendance was blocked.", 409);
        throw e;
      }
      await audit("Accepted", session.require_ip ? "Attendance saved; public IP matched teacher session." : "Attendance saved; IP matching disabled by teacher.");
      return answer({ ok: true, name: s.name, roll: s.roll, method, verifiedIp: ip });
    }
    return fail("Unknown action.");
  } catch (e) {
    console.error(e);
    return fail("Unable to save attendance. Please retry.", 503);
  }
}

// app/api/checkin/route.ts
var route_exports3 = {};
__export(route_exports3, {
  GET: () => GET4,
  POST: () => POST4,
  dynamic: () => dynamic3
});

// app/lib/direct-checkin.ts
var answer2 = (body, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
async function sessionFor(token) {
  if (!/^[a-f0-9-]{36}$/i.test(token)) return null;
  return env.DB.prepare("SELECT token,subject,room,class_date,expires,open,ip,require_ip FROM sessions WHERE token=? AND mode='qr' AND auth='direct'").bind(token).first();
}
async function GET3(request) {
  try {
    const url = new URL(request.url), token = url.searchParams.get("session") || "", receipt = url.searchParams.get("receipt");
    if (receipt) {
      const row = await env.DB.prepare("SELECT status FROM attendance_requests WHERE token=? AND receipt_hash=?").bind(token, await digest(receipt)).first();
      if (!row) return answer2({ error: "Request receipt not found." }, 404);
      return answer2({ requestStatus: row.status, message: row.status === "Pending" ? "Waiting for teacher approval. Attendance is not marked yet." : row.status === "Approved" ? "Your teacher approved the request. Attendance is recorded." : "Your teacher rejected the request. Contact them for help." });
    }
    const session = await sessionFor(token);
    if (!session || !session.open || session.expires <= Date.now()) return answer2({ error: "This direct QR session is closed, expired or unavailable. Ask the teacher for a new QR." }, 410);
    const ip = request.headers.get("cf-connecting-ip") || "";
    return answer2({ session: { subject: session.subject, room: session.room, classDate: session.class_date, expires: session.expires }, connectionRequired: !!session.require_ip, connectionMatches: !session.require_ip || !!ip && ip === session.ip });
  } catch {
    return answer2({ error: "Attendance service unavailable." }, 503);
  }
}
async function POST3(request) {
  try {
    if (request.headers.get("origin") !== new URL(request.url).origin) return answer2({ error: "Request origin rejected." }, 403);
    const raw = await request.text();
    if (raw.length > 1600) return answer2({ error: "Request too large." }, 413);
    let b2;
    try {
      b2 = JSON.parse(raw);
    } catch {
      return answer2({ error: "Enter a valid name and roll number." }, 400);
    }
    const token = String(b2?.session || ""), name = String(b2?.name || "").trim(), roll = String(b2?.roll || "").trim(), ip = request.headers.get("cf-connecting-ip") || "";
    const session = await sessionFor(token);
    if (!session || !session.open || session.expires <= Date.now()) return answer2({ error: "Session closed or expired. Ask the teacher for a new QR." }, 410);
    const recent = await env.DB.prepare("SELECT COUNT(*) n FROM scan_events WHERE actor='direct-qr' AND token=? AND ip=? AND time>? AND status IN ('Rejected','Pending')").bind(token, ip, Date.now() - 3e5).first();
    if (Number(recent?.n) >= 60) return answer2({ error: "Too many requests from this connection. Ask the teacher for assistance." }, 429);
    let student = null;
    const audit = async (status, reason) => env.DB.prepare("INSERT INTO scan_events (id,token,student_id,actor,method,ip,status,reason,time) VALUES (?,?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(), token, student?.id || null, "direct-qr", "qr", ip, status, reason, Date.now()).run();
    if (session.require_ip && (!ip || ip !== session.ip)) {
      await audit("Rejected", "Direct QR connection mismatch");
      return answer2({ error: "Connect to the teacher\u2019s internet connection and retry." }, 403);
    }
    if (!name || name.length > 60 || /[\u0000-\u001f]/.test(name) || roll.length > 30 || !roll) {
      await audit("Rejected", "Invalid name or roll entry");
      return answer2({ error: "Enter your full registered name and roll number." }, 400);
    }
    const normalized = normalizeStudentName(name);
    student = await env.DB.prepare("SELECT id,name,created_at FROM students WHERE roll=?").bind(roll).first();
    if (!student || normalizeStudentName(student.name) !== normalized || student.created_at > session.expires) {
      const existing = await env.DB.prepare("SELECT id,status FROM attendance_requests WHERE token=? AND roll=? AND normalized_name=?").bind(token, roll, normalized).first();
      if (existing) return answer2({ ok: true, pending: existing.status === "Pending", requestStatus: existing.status, message: existing.status === "Pending" ? "This name and roll already have a request waiting for teacher approval." : existing.status === "Approved" ? "Your teacher has approved this request. Attendance is recorded." : "This request was rejected. Contact your teacher." });
      const receipt = randomToken(), id = crypto.randomUUID(), now2 = Date.now();
      const result = await env.DB.prepare("INSERT OR IGNORE INTO attendance_requests (id,token,name,normalized_name,roll,status,student_id,ip,created,receipt_hash) SELECT ?,?,?,?,?,'Pending',?,?,?,? WHERE EXISTS (SELECT 1 FROM sessions WHERE token=? AND open=1 AND expires>?)").bind(id, token, name, normalized, roll, student?.id || null, ip, now2, await digest(receipt), token, now2).run();
      if (!result.meta.changes) return answer2({ error: "Session closed or request already submitted. Please refresh." }, 409);
      await audit("Pending", "Name/roll did not match the roster; sent for teacher approval");
      return answer2({ ok: true, pending: true, requestStatus: "Pending", receipt, message: "Request sent to your teacher for approval. Attendance is not marked yet." }, 202);
    }
    const now = Date.now();
    let alreadyPresent = false;
    try {
      const result = await env.DB.prepare("INSERT INTO attendance (id,student_id,token,time,method) SELECT ?,?,?,?,? WHERE EXISTS (SELECT 1 FROM sessions WHERE token=? AND open=1 AND expires>?)").bind(crypto.randomUUID(), student.id, token, now, "Direct QR + registered name/roll", token, now).run();
      if (!result.meta.changes) return answer2({ error: "Session closed while checking in." }, 410);
    } catch (e) {
      if (String(e).includes("UNIQUE")) alreadyPresent = true;
      else throw e;
    }
    await env.DB.prepare("UPDATE attendance_requests SET status='Approved',student_id=?,reviewer='Automatic name/roll match',reviewed=? WHERE token=? AND roll=? AND normalized_name=? AND status='Pending'").bind(student.id, now, token, roll, normalized).run();
    if (!alreadyPresent) await audit("Accepted", session.require_ip ? "Registered name/roll matched; public IP matched" : "Registered name/roll matched; IP check disabled by teacher");
    return answer2({ ok: true, alreadyPresent, message: alreadyPresent ? "Attendance is already recorded for this student." : "Name and roll matched. Attendance recorded successfully." });
  } catch {
    return answer2({ error: "Unable to record attendance. Retry or contact your teacher." }, 503);
  }
}

// app/lib/attendance-login.ts
function attendanceReturnPath(token) {
  return "/student?session=" + encodeURIComponent(token);
}
function attendanceLoginPath(token) {
  return "/student-login?returnTo=" + encodeURIComponent(attendanceReturnPath(token));
}

// app/api/checkin/route.ts
var dynamic3 = "force-dynamic";
var reply2 = (body, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
async function GET4(request) {
  try {
    request = await proxyRequest(request);
    const token = new URL(request.url).searchParams.get("session") || "";
    const policy = await env.DB.prepare("SELECT auth FROM sessions WHERE token=? AND mode=?").bind(token, "qr").first();
    if (policy?.auth === "direct") return GET3(request);
    const user = await getAccountUser(request);
    if (!user) return reply2({ error: "Sign in with your ClassSync student account to request attendance.", loginRequired: true, loginUrl: attendanceLoginPath(token) }, 401);
    if (user.role !== "student") return reply2({ error: "Use a student account for QR attendance." }, 403);
    const session = await env.DB.prepare("SELECT subject,room,open,expires,require_ip,ip FROM sessions WHERE token=? AND mode=?").bind(token, "qr").first();
    if (!session) return reply2({ error: "Class session not found." }, 404);
    const approval = await env.DB.prepare("SELECT status FROM attendance_requests WHERE token=? AND account_id=?").bind(token, user.userId).first();
    return reply2({ approvalRequired: true, requestStatus: approval?.status || null, session: { subject: session.subject, room: session.room, open: session.open, expires: session.expires }, connectionRequired: !!session.require_ip, connectionMatches: !session.require_ip || !!session.ip && session.ip === request.headers.get("cf-connecting-ip") });
  } catch {
    return reply2({ error: "Attendance service unavailable." }, 503);
  }
}
async function POST4(request) {
  try {
    request = await proxyRequest(request);
    const cloned = request.clone();
    if (request.headers.get("origin") !== new URL(request.url).origin) return reply2({ error: "Request origin rejected." }, 403);
    const raw = await request.text();
    if (raw.length > 1600) return reply2({ error: "Request too large." }, 413);
    let b2;
    try {
      b2 = JSON.parse(raw);
    } catch {
      return reply2({ error: "Send a valid attendance request." }, 400);
    }
    const token = String(b2?.session || b2?.token || "");
    const policy = await env.DB.prepare("SELECT auth FROM sessions WHERE token=? AND mode=?").bind(token, "qr").first();
    if (policy?.auth === "direct") return POST3(cloned);
    const user = await getAccountUser(request);
    if (!user) return reply2({ error: "Student login is required before requesting attendance.", loginRequired: true, loginUrl: attendanceLoginPath(token) }, 401);
    return reply2(await submitStudentAttendanceRequest({ db: env.DB, user, teacher: user.role === "teacher" }, token, request.headers.get("cf-connecting-ip") || ""));
  } catch (e) {
    return reply2({ error: e instanceof Error ? e.message : "Unable to request attendance." }, e?.status || 503);
  }
}

// app/api/demo-attendance/route.ts
var route_exports4 = {};
__export(route_exports4, {
  GET: () => GET5,
  POST: () => POST5,
  dynamic: () => dynamic4
});
var dynamic4 = "force-dynamic";
var DAY = 864e5;
var reply3 = (value, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
function fail2(message2, status = 400) {
  throw Object.assign(Error(message2), { status });
}
var text = (v, max) => {
  if (typeof v !== "string" || !v.trim() || v.trim().length > max) fail2("Enter valid attendance details.");
  return v.trim();
};
var message = (status) => status === "Approved" ? "Attendance recorded. Your teacher can see it in the demo register." : status === "Rejected" ? "Your teacher rejected this request. Contact them if a correction is needed." : "Request sent. Waiting for teacher approval; attendance is not marked yet.";
async function getSession(token) {
  const s = await env.DB.prepare("SELECT * FROM demo_qr_sessions WHERE token=?").bind(token).first();
  if (!s || s.created < Date.now() - DAY) fail2("This demo session is unavailable. Ask the teacher to create a fresh QR.", 404);
  return s;
}
function active(s) {
  if (!s.open || s.expires <= Date.now()) fail2("This class is closed or expired. Ask the teacher for a fresh QR.", 410);
}
function connection3(s, request) {
  if (s.require_ip && (!s.ip || s.ip !== request.headers.get("cf-connecting-ip"))) fail2("Your teacher requires matching IP. Use their network or ask them to turn off matching IP.", 403);
}
function roster(s) {
  return JSON.parse(s.roster);
}
async function GET5(request) {
  try {
    request = await proxyRequest(request);
    const url = new URL(request.url), token = url.searchParams.get("session") || "", s = await getSession(token), receipt = url.searchParams.get("receipt");
    if (receipt) {
      const r = await env.DB.prepare("SELECT status FROM demo_qr_requests WHERE token=? AND receipt_hash=?").bind(token, await digest(receipt)).first();
      if (!r) fail2("Attendance receipt not found.", 404);
      return reply3({ requestStatus: r.status, message: message(r.status) });
    }
    return reply3({ session: { token: s.token, subject: s.subject, room: s.room, auth: s.auth, expires: s.expires, open: s.open, class_date: s.class_date }, connectionRequired: !!s.require_ip, connectionMatches: !s.require_ip || !!s.ip && s.ip === request.headers.get("cf-connecting-ip") });
  } catch (e) {
    return reply3({ error: e instanceof Error ? e.message : "Demo attendance unavailable." }, e?.status || 503);
  }
}
async function POST5(request) {
  try {
    request = await proxyRequest(request);
    if (request.headers.get("origin") !== new URL(request.url).origin) fail2("Request origin rejected.", 403);
    const raw = await request.text();
    if (raw.length > 24e3) fail2("Request too large.", 413);
    let b2;
    try {
      b2 = JSON.parse(raw);
    } catch {
      fail2("Send valid attendance details.");
    }
    const db = env.DB, now = Date.now(), ip = request.headers.get("cf-connecting-ip") || "";
    if (b2.action === "create") {
      const token = text(b2.token, 80);
      if (!/^[-a-f0-9]{36}$/i.test(token)) fail2("Invalid demo token.");
      const owner = text(b2.owner, 100);
      if (owner.length < 32) fail2("Invalid teacher demo key.");
      const ownerHash = await digest(owner), existing = await db.prepare("SELECT * FROM demo_qr_sessions WHERE token=?").bind(token).first();
      if (existing && existing.owner_hash !== ownerHash) fail2("Teacher demo key does not match.", 403);
      const students = b2.students;
      if (!Array.isArray(students) || students.length > 100) fail2("Use at most 100 demo students.");
      const clean = students.map((s2) => ({ id: text(s2.id, 80), name: text(s2.name, 60), roll: text(s2.roll, 30) }));
      if (new Set(clean.map((s2) => s2.roll)).size !== clean.length) fail2("Use unique demo rolls.");
      const auth2 = ["approval", "manual", "direct", "account"].includes(b2.auth) ? b2.auth : "approval", subject = text(b2.subject, 100), room = text(b2.room, 80), classDate = text(b2.classDate, 12), requireIp = b2.requireIp === true ? 1 : 0;
      if (existing) {
        await db.prepare("UPDATE demo_qr_sessions SET roster=?,open=?,require_ip=?,ip=? WHERE token=? AND owner_hash=?").bind(JSON.stringify(clean), b2.open === false ? 0 : existing.open, requireIp, requireIp ? ip : "", token, ownerHash).run();
        return reply3({ ok: true, shared: true });
      }
      const expires = Number(b2.expires);
      if (!Number.isFinite(expires) || expires <= now || expires > now + 61e4) fail2("Choose a demo QR lasting at most 10 minutes.");
      const creatorHash = await digest(ip), count2 = await db.prepare("SELECT COUNT(*) n FROM demo_qr_sessions WHERE creator_hash=? AND created>?").bind(creatorHash, now - 36e5).first();
      if (count2.n >= 30) fail2("Too many demo sessions. Please try later.", 429);
      await db.batch([db.prepare("DELETE FROM demo_qr_requests WHERE token IN (SELECT token FROM demo_qr_sessions WHERE created<?)").bind(now - DAY), db.prepare("DELETE FROM demo_qr_sessions WHERE created<?").bind(now - DAY), db.prepare("UPDATE demo_qr_sessions SET open=0 WHERE owner_hash=?").bind(ownerHash), db.prepare("INSERT INTO demo_qr_sessions (token,owner_hash,creator_hash,subject,room,auth,class_date,expires,open,require_ip,ip,roster,created) VALUES (?,?,?,?,?,?,?,?,1,?,?,?,?)").bind(token, ownerHash, creatorHash, subject, room, auth2, classDate, expires, requireIp, requireIp ? ip : "", JSON.stringify(clean), now)]);
      return reply3({ ok: true, shared: true });
    }
    if (b2.action === "list") {
      const ownerHash = await digest(text(b2.owner, 100));
      const rows = await db.prepare("SELECT r.id,r.token,r.name,r.normalized_name,r.roll,r.student_id,r.status,r.created,r.reviewed,s.subject,s.room,s.class_date FROM demo_qr_requests r JOIN demo_qr_sessions s ON s.token=r.token WHERE s.owner_hash=? AND s.created>? ORDER BY r.created DESC LIMIT 1000").bind(ownerHash, now - DAY).all();
      return reply3({ requests: rows.results });
    }
    const s = await getSession(text(b2.token, 80));
    if (b2.action === "review" || b2.action === "mark" || b2.action === "close") {
      if (await digest(text(b2.owner, 100)) !== s.owner_hash) fail2("Only the creating teacher demo can manage this session.", 403);
      if (b2.action === "close") {
        await db.prepare("UPDATE demo_qr_sessions SET open=0 WHERE token=?").bind(s.token).run();
        return reply3({ ok: true });
      }
      if (b2.action === "mark") {
        active(s);
        connection3(s, request);
        if (!["manual", "direct"].includes(s.auth)) fail2("Use student approval for this session.", 403);
        const student3 = roster(s).find((x) => x.id === b2.studentId);
        if (!student3) fail2("Choose a registered demo student.");
        await db.prepare("INSERT INTO demo_qr_requests (id,token,name,normalized_name,roll,student_id,status,receipt_hash,created,reviewed) VALUES (?,?,?,?,?,?,'Approved',?,?,?) ON CONFLICT(token,roll,normalized_name) DO UPDATE SET status='Approved',student_id=excluded.student_id,reviewed=excluded.reviewed").bind(crypto.randomUUID(), s.token, student3.name, normalizeStudentName(student3.name), student3.roll, student3.id, await digest(randomToken()), now, now).run();
        return reply3({ ok: true, name: student3.name });
      }
      const r = await db.prepare("SELECT * FROM demo_qr_requests WHERE id=? AND token=?").bind(text(b2.requestId, 80), s.token).first();
      if (!r) fail2("Request not found.", 404);
      if (r.status !== "Pending") fail2("Request already reviewed.", 409);
      if (!["Approve", "Reject"].includes(b2.decision)) fail2("Choose Approve or Reject.");
      const student2 = roster(s).find((x) => x.roll === r.roll);
      if (b2.decision === "Approve" && !student2) fail2("Register this roll in the teacher demo first.", 409);
      const changed = await db.prepare("UPDATE demo_qr_requests SET status=?,student_id=?,reviewed=? WHERE id=? AND status='Pending'").bind(b2.decision === "Approve" ? "Approved" : "Rejected", student2?.id || null, now, r.id).run();
      if (!changed.meta.changes) fail2("Request already reviewed.", 409);
      return reply3({ ok: true });
    }
    if (b2.action !== "submit") fail2("Unknown demo attendance action.");
    active(s);
    connection3(s, request);
    const name = text(b2.name, 60), roll = text(b2.roll, 30), normal = normalizeStudentName(name), student = roster(s).find((x) => x.roll === roll), match = student && normalizeStudentName(student.name) === normal;
    if (s.auth === "account" && !match) fail2("Enter the name and roll registered in this demo.");
    const receipt = text(b2.receipt, 100);
    if (receipt.length < 32) fail2("Invalid attendance receipt.");
    const receiptHash = await digest(receipt);
    const previous = await db.prepare("SELECT status,receipt_hash FROM demo_qr_requests WHERE token=? AND roll=? AND normalized_name=?").bind(s.token, roll, normal).first();
    if (previous) {
      if (previous.receipt_hash !== receiptHash) fail2("This student already submitted for this class. Use the original browser to view the decision.", 409);
      return reply3({ ok: true, requestStatus: previous.status, message: message(previous.status) });
    }
    const count = await db.prepare("SELECT COUNT(*) n FROM demo_qr_requests WHERE token=?").bind(s.token).first();
    if (count.n >= 200) fail2("Demo request limit reached.", 429);
    const status = match && ["direct", "account"].includes(s.auth) ? "Approved" : "Pending";
    const result = await db.prepare("INSERT OR IGNORE INTO demo_qr_requests (id,token,name,normalized_name,roll,student_id,status,receipt_hash,created,reviewed) SELECT ?,?,?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM demo_qr_sessions WHERE token=? AND open=1 AND expires>?)").bind(crypto.randomUUID(), s.token, name, normal, roll, student?.id || null, status, receiptHash, now, status === "Approved" ? now : null, s.token, now).run();
    if (!result.meta.changes) fail2("Class closed or attendance was already submitted. Refresh the page.", 409);
    return reply3({ ok: true, requestStatus: status, message: message(status) });
  } catch (e) {
    return reply3({ error: e instanceof Error ? e.message : "Demo attendance unavailable." }, e?.status || 503);
  }
}

// app/api/face-enrollment/route.ts
var route_exports5 = {};
__export(route_exports5, {
  GET: () => GET6,
  POST: () => POST6,
  dynamic: () => dynamic5
});
var dynamic5 = "force-dynamic";
var reply4 = (b2, status = 200) => Response.json(b2, { status, headers: { "Cache-Control": "no-store" } });
function fail3(message2, status = 400) {
  throw Object.assign(Error(message2), { status });
}
var str = (s, n = 100) => {
  if (typeof s !== "string" || !s.trim() || s.length > n) fail3("Enter valid enrollment details.");
  return s.trim();
};
var vector = (d) => Array.isArray(d) && d.length === 128 && d.every((x) => typeof x === "number" && Number.isFinite(x) && Math.abs(x) < 10);
async function linkFor(token, open = true) {
  const row = await env.DB.prepare("SELECT * FROM face_enrollment_links WHERE token=?").bind(token).first();
  if (!row) fail3("Enrollment link not found. Ask the teacher for a new QR.", 404);
  if (open && (!row.open || row.expires <= Date.now())) fail3("Enrollment link closed or expired. Ask the teacher for a new QR.", 410);
  return row;
}
async function teacher(request, b2) {
  if (b2.scope === "demo") {
    const owner = str(b2.owner);
    if (owner.length < 32) fail3("Invalid demo teacher key.", 403);
    return { scope: "demo", owner: await digest(owner) };
  }
  const u = await getAccountUser(request);
  if (!u) fail3("Sign in as the teacher.", 401);
  if (u.role !== "teacher") fail3("Teacher permission required.", 403);
  const w = await env.DB.prepare("SELECT owner FROM workspace WHERE id=?").bind("classroom").first();
  if (w?.owner !== u.userId) fail3("Teacher permission required.", 403);
  return { scope: "live", owner: u.userId };
}
async function identity(request, link, b2) {
  if (link.scope === "live") {
    const u = await getAccountUser(request);
    if (!u) {
      if (!JSON.parse(link.roster).length) fail3("Sign in with your ClassSync student account.", 401);
      const roll2 = normalizeRoll(str(b2.roll, 30)), name2 = str(b2.name, 60), receipt2 = str(b2.receipt);
      if (receipt2.length < 32) fail3("Invalid enrollment receipt.");
      const s3 = await env.DB.prepare("SELECT s.id,s.name,s.roll,r.expected_name FROM registration_roster r JOIN students s ON s.id=r.student_id WHERE r.roll=? AND r.owner=?").bind(roll2, link.owner).first();
      if (!s3 || !JSON.parse(link.roster).some((r) => r.id === s3.id) || s3.expected_name && normalizeStudentName(s3.expected_name) !== normalizeStudentName(name2)) fail3("Name or roll does not match the teacher\u2019s uploaded class list. Ask the teacher to check your details.", 403);
      return { id: s3.id, roll: s3.roll, name: s3.expected_name || name2, actor: "self-roster:" + await digest(receipt2) };
    }
    if (u.role !== "student") fail3("Use a student account to enroll your own face.", 403);
    const s2 = await env.DB.prepare("SELECT id,name,roll FROM students WHERE email=?").bind(u.email.toLowerCase()).first();
    if (!s2) fail3("Ask your teacher to register your account email.", 403);
    return { ...s2, actor: u.userId };
  }
  const receipt = str(b2.receipt);
  if (receipt.length < 32) fail3("Invalid enrollment receipt.");
  const roll = str(b2.roll, 30), name = str(b2.name, 60), s = JSON.parse(link.roster).find((s2) => s2.roll === roll && (s2.name === "Name awaiting verification" || normalizeStudentName(s2.name) === normalizeStudentName(name)));
  if (!s) fail3("Name and roll must match the teacher\u2019s demo roster.", 403);
  return { ...s, name: s.name === "Name awaiting verification" ? name : s.name, actor: "self-demo:" + await digest(receipt) };
}
async function current(link, studentId) {
  return env.DB.prepare("SELECT id,status,created,reviewed FROM face_enrollment_requests WHERE scope=? AND owner=? AND student_id=?").bind(link.scope, link.owner, studentId).first();
}
async function GET6(request) {
  try {
    request = await proxyRequest(request);
    const url = new URL(request.url), link = await linkFor(url.searchParams.get("enrollment") || "", false);
    if (link.scope === "live") {
      const u = await getAccountUser(request);
      if (!u && JSON.parse(link.roster).length) {
        const receipt2 = url.searchParams.get("receipt");
        if (receipt2) {
          const r = await env.DB.prepare("SELECT status,created,reviewed FROM face_enrollment_requests WHERE scope='live' AND owner=? AND receipt_hash=?").bind(link.owner, await digest(receipt2)).first();
          if (!r) fail3("Enrollment receipt not found.", 404);
          return reply4({ request: r });
        }
        return reply4({ scope: "roster", open: !!link.open, expires: link.expires });
      }
      if (!u) return reply4({ error: "Sign in to enroll your face.", loginRequired: true, loginUrl: "/student-login?returnTo=" + encodeURIComponent("/face-enroll.html?enrollment=" + encodeURIComponent(link.token)) }, 401);
      const s = await identity(request, link, {});
      return reply4({ scope: "live", open: !!link.open, expires: link.expires, student: { id: s.id, name: s.name, roll: s.roll }, request: await current(link, s.id) });
    }
    const receipt = url.searchParams.get("receipt");
    if (receipt) {
      const r = await env.DB.prepare("SELECT status,created,reviewed FROM face_enrollment_requests WHERE scope=? AND owner=? AND receipt_hash=?").bind("demo", link.owner, await digest(receipt)).first();
      if (!r) fail3("Enrollment receipt not found.", 404);
      return reply4({ request: r });
    }
    return reply4({ scope: "demo", open: !!link.open, expires: link.expires });
  } catch (e) {
    return reply4({ error: e instanceof Error ? e.message : "Enrollment unavailable." }, e?.status || 503);
  }
}
async function POST6(request) {
  try {
    request = await proxyRequest(request);
    if (request.headers.get("origin") !== new URL(request.url).origin) fail3("Request origin rejected.", 403);
    const raw = await request.text();
    if (raw.length > 3e4) fail3("Request too large.", 413);
    let b2;
    try {
      b2 = JSON.parse(raw);
    } catch {
      fail3("Send valid enrollment details.");
    }
    if (!b2 || typeof b2 !== "object" || Array.isArray(b2)) fail3("Send valid enrollment details.");
    const db = env.DB, now = Date.now();
    if (["create", "list", "review", "reviewBatch", "close", "revoke"].includes(b2.action)) {
      const t = await teacher(request, b2);
      if (b2.action === "reviewBatch") {
        if (!Array.isArray(b2.requestIds) || b2.requestIds.length < 1 || b2.requestIds.length > 100 || new Set(b2.requestIds).size !== b2.requestIds.length || b2.requestIds.some((id2) => typeof id2 !== "string" || id2.length > 100)) fail3("Select 1 to 100 pending enrollment requests.");
        if (!["Approve", "Reject"].includes(b2.decision)) fail3("Choose Approve or Reject.");
        if (b2.decision === "Approve" && b2.verified !== true) fail3("Confirm identity verification for the selected students.");
        const results = [];
        for (const id2 of b2.requestIds) {
          const response = await POST6(new Request(request.url, { method: "POST", headers: request.headers, body: JSON.stringify({ ...b2, action: "review", requestIds: void 0, requestId: id2 }) }));
          const result3 = await response.json();
          results.push({ id: id2, ok: response.ok, error: result3.error });
        }
        return reply4({ ok: true, processed: results.filter((r2) => r2.ok).length, failed: results.filter((r2) => !r2.ok).length, results });
      }
      if (b2.action === "create") {
        const scope = t.scope, owner = t.owner, roster2 = scope === "demo" ? b2.students : [];
        if (!Array.isArray(roster2) || roster2.length > 150) fail3("Use at most 150 demo students.");
        let clean = roster2.map((s2) => ({ id: str(s2.id, 80), name: str(s2.name, 60), roll: str(s2.roll, 30) }));
        if (new Set(clean.map((s2) => s2.roll)).size !== clean.length) fail3("Use unique demo rolls.");
        if (scope === "live") clean = (await db.prepare("SELECT student_id AS id FROM registration_roster WHERE owner=?").bind(owner).all()).results;
        const creator = await digest(request.headers.get("cf-connecting-ip") || "");
        const count = await db.prepare("SELECT COUNT(*) n FROM face_enrollment_links WHERE creator_hash=? AND created>?").bind(creator, now - 36e5).first();
        if (count.n >= 30) fail3("Too many enrollment links. Try later.", 429);
        const token = crypto.randomUUID(), expires = now + 36e5;
        await db.batch([db.prepare("UPDATE face_enrollment_links SET open=0 WHERE scope=? AND owner=?").bind(scope, owner), db.prepare("INSERT INTO face_enrollment_links (token,scope,owner,creator_hash,roster,created,expires,open) VALUES (?,?,?,?,?,?,?,1)").bind(token, scope, owner, creator, JSON.stringify(clean), now, expires)]);
        return reply4({ ok: true, token, expires, url: "/face-enroll.html?enrollment=" + encodeURIComponent(token) });
      }
      if (b2.action === "list") {
        const rows = (await db.prepare("SELECT id,student_id,name,roll,status,created,reviewed,descriptors FROM face_enrollment_requests WHERE scope=? AND owner=? ORDER BY created DESC LIMIT 500").bind(t.scope, t.owner).all()).results;
        const link2 = await db.prepare("SELECT token,expires,open FROM face_enrollment_links WHERE scope=? AND owner=? ORDER BY created DESC LIMIT 1").bind(t.scope, t.owner).first();
        return reply4({ requests: rows.map((r2) => ({ ...r2, descriptors: t.scope === "demo" && r2.status === "Approved" ? r2.descriptors : void 0 })), link: link2 });
      }
      if (b2.action === "close") {
        await db.prepare("UPDATE face_enrollment_links SET open=0 WHERE token=? AND scope=? AND owner=?").bind(str(b2.token), t.scope, t.owner).run();
        return reply4({ ok: true });
      }
      if (b2.action === "revoke") {
        const studentId = str(b2.studentId);
        const statements2 = [db.prepare("UPDATE face_enrollment_requests SET descriptors=NULL,status='Revoked',reviewed=? WHERE scope=? AND owner=? AND student_id=?").bind(now, t.scope, t.owner, studentId)];
        if (t.scope === "live") statements2.push(db.prepare("UPDATE students SET descriptors=NULL WHERE id=?").bind(studentId));
        await db.batch(statements2);
        return reply4({ ok: true });
      }
      const r = await db.prepare("SELECT * FROM face_enrollment_requests WHERE id=? AND scope=? AND owner=?").bind(str(b2.requestId), t.scope, t.owner).first();
      if (!r) fail3("Enrollment request not found.", 404);
      if (r.status !== "Pending") fail3("This request was already reviewed.", 409);
      if (!["Approve", "Reject"].includes(b2.decision)) fail3("Choose Approve or Reject.");
      if (b2.decision === "Approve") {
        if (b2.verified !== true) fail3("Confirm that you verified the student\u2019s identity before approval.");
        if (!r.descriptors) fail3("Face samples unavailable. Ask the student to enroll again.");
        const ds = JSON.parse(r.descriptors);
        if (t.scope === "live") {
          if (!await db.prepare("SELECT id FROM students WHERE id=?").bind(r.student_id).first()) fail3("Student registration removed.", 409);
          const enrolled = (await db.prepare("SELECT id,descriptors FROM students WHERE descriptors IS NOT NULL AND id<>?").bind(r.student_id).all()).results;
          for (const s2 of enrolled) if (JSON.parse(s2.descriptors).some((d) => faceDistance(d, ds[0]) < 0.35)) fail3("A very similar face is already registered to another student. Verify the identity and enrollment.", 409);
        } else {
          const others = (await db.prepare("SELECT student_id,descriptors FROM face_enrollment_requests WHERE scope=? AND owner=? AND status='Approved' AND student_id<>?").bind("demo", t.owner, r.student_id).all()).results;
          for (const s2 of others) if (s2.descriptors && JSON.parse(s2.descriptors).some((d) => faceDistance(d, ds[0]) < 0.35)) fail3("A similar face is already enrolled for another demo student. Verify before retrying.", 409);
        }
      }
      const statements = [];
      if (t.scope === "live" && b2.decision === "Approve") statements.push(db.prepare("UPDATE students SET descriptors=? WHERE id=? AND EXISTS(SELECT 1 FROM face_enrollment_requests WHERE id=? AND status='Pending')").bind(r.descriptors, r.student_id, r.id));
      if (t.scope === "live" && b2.decision === "Approve") statements.push(db.prepare("UPDATE students SET name=? WHERE id=? AND email LIKE '%@roster.invalid' AND name='Name awaiting verification'").bind(r.name, r.student_id));
      statements.push(db.prepare("UPDATE face_enrollment_requests SET status=?,descriptors=?,reviewed=? WHERE id=? AND status='Pending'").bind(b2.decision === "Approve" ? "Approved" : "Rejected", b2.decision === "Approve" ? r.descriptors : null, now, r.id));
      const result2 = await db.batch(statements);
      if (!result2.at(-1)?.meta.changes) fail3("This request was already reviewed.", 409);
      return reply4({ ok: true, status: b2.decision === "Approve" ? "Approved" : "Rejected" });
    }
    const link = await linkFor(str(b2.token)), s = await identity(request, link, b2);
    if (b2.action === "identify" && link.scope === "live" && !s.actor.startsWith("self-roster:") && b2.name && (normalizeStudentName(b2.name) !== normalizeStudentName(s.name) || normalizeRoll(b2.roll) !== normalizeRoll(s.roll))) fail3("Use the name and roll registered to your student account.", 403);
    if (b2.action === "identify") return reply4({ student: { id: s.id, name: s.name, roll: s.roll }, request: await current(link, s.id) });
    const actor = "self-enroll:" + s.actor;
    if (b2.action === "challenge") {
      if (!b2.consent) fail3("Consent is required before capturing face samples.");
      const existing2 = await current(link, s.id);
      if (existing2?.status === "Pending" || existing2?.status === "Approved") fail3("Your enrollment is already pending or approved. Ask your teacher before enrolling again.", 409);
      const random = crypto.getRandomValues(new Uint8Array(2)), c2 = { nonce: crypto.randomUUID(), order: random[0] % 2 ? "blink-turn" : "turn-blink", direction: random[1] % 2 ? 1 : -1, expires: Math.min(now + 9e4, link.expires) };
      await db.batch([db.prepare("DELETE FROM liveness_challenges WHERE actor=? OR expires<?").bind(actor, now), db.prepare("INSERT INTO liveness_challenges (nonce,actor,token,purpose,student_id,challenge_order,direction,created,expires,used) VALUES (?,?,?,?,?,?,?,?,?,0)").bind(c2.nonce, actor, link.token, "self-enroll", s.id, c2.order, c2.direction, now, c2.expires)]);
      return reply4(c2);
    }
    if (b2.action !== "submit") fail3("Unknown enrollment action.");
    if (!b2.consent || !Array.isArray(b2.descriptors) || b2.descriptors.length !== 3 || !b2.descriptors.every(vector)) fail3("Consent and three valid face samples are required.");
    const p = b2.liveness;
    if (!p || typeof p.nonce !== "string") fail3("Complete a fresh liveness challenge.", 403);
    const c = await db.prepare("SELECT * FROM liveness_challenges WHERE nonce=?").bind(p.nonce).first();
    if (!c || c.actor !== actor || c.token !== link.token || c.student_id !== s.id || c.purpose !== "self-enroll" || c.used || c.expires <= now) fail3("Liveness challenge expired, used or mismatched. Retry.", 403);
    const status = evaluateLiveness(p.samples, c.challenge_order, c.direction);
    if (!status.complete || p.samples.length < 10 || p.samples.at(-1).t > now - c.created + 1e3 || faceDistance(p.startDescriptor, p.endDescriptor) > 0.45 || b2.descriptors.some((d) => faceDistance(d, p.endDescriptor) > 0.5)) fail3("Complete all motion steps with the same face. Retry enrollment.", 403);
    const existing = await current(link, s.id);
    if (existing?.status === "Pending") fail3("Your request is already pending.", 409);
    const used = await db.prepare("UPDATE liveness_challenges SET used=1 WHERE nonce=? AND used=0 AND expires>?").bind(c.nonce, now).run();
    if (!used.meta.changes) fail3("Liveness challenge already used.", 409);
    const receiptHash = link.scope === "demo" || s.actor.startsWith("self-roster:") ? await digest(str(b2.receipt)) : "", id = crypto.randomUUID();
    const result = await db.prepare("INSERT INTO face_enrollment_requests (id,scope,owner,token,student_id,name,roll,account_id,receipt_hash,descriptors,status,created,reviewed) SELECT ?,?,?,?,?,?,?,?,?,?,'Pending',?,NULL WHERE EXISTS(SELECT 1 FROM face_enrollment_links WHERE token=? AND open=1 AND expires>?) ON CONFLICT(scope,owner,student_id) DO UPDATE SET token=excluded.token,name=excluded.name,roll=excluded.roll,account_id=excluded.account_id,receipt_hash=excluded.receipt_hash,descriptors=excluded.descriptors,status='Pending',created=excluded.created,reviewed=NULL WHERE face_enrollment_requests.status<>'Pending'").bind(id, link.scope, link.owner, link.token, s.id, s.name, s.roll, s.actor, receiptHash, JSON.stringify(b2.descriptors), now, link.token, now).run();
    if (!result.meta.changes) fail3("Enrollment closed or a request is already pending.", 409);
    return reply4({ ok: true, status: "Pending", message: "Face enrollment sent. Your teacher must approve before it can mark attendance." });
  } catch (e) {
    return reply4({ error: e instanceof Error ? e.message : "Face enrollment unavailable." }, e?.status || 503);
  }
}

// server/vercel.ts
var routes = { auth: route_exports, attendance: route_exports2, checkin: route_exports3, "demo-attendance": route_exports4, "face-enrollment": route_exports5 };
async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const endpoint = req.query.endpoint;
  if (typeof endpoint !== "string" || !Object.hasOwn(routes, endpoint)) return res.status(404).json({ error: "Unknown API endpoint." });
  if (!["GET", "POST"].includes(req.method)) return res.status(405).json({ error: "Method not allowed." });
  const host = req.headers.host;
  if (!host || !/^[a-z0-9.-]+(?::\d+)?$/i.test(host)) return res.status(400).json({ error: "Invalid host." });
  const origin = "https://" + host;
  if (req.method === "POST" && req.headers.origin !== origin) return res.status(403).json({ error: "Request origin rejected." });
  const url = new URL("/api/" + endpoint, origin);
  for (const [key, value] of Object.entries(req.query)) if (!["endpoint", "path"].includes(key) && typeof value === "string") url.searchParams.set(key, value);
  const headers = new Headers({ "Content-Type": "application/json" });
  if (req.headers.cookie) headers.set("cookie", req.headers.cookie);
  if (req.headers.origin) headers.set("origin", req.headers.origin);
  headers.set("cf-connecting-ip", String(req.headers["x-forwarded-for"] || "").split(",")[0].trim());
  const body = typeof req.body === "string" ? req.body : JSON.stringify(req.body || {});
  if (Buffer.byteLength(body) > 15e4) return res.status(413).json({ error: "Request too large." });
  try {
    const request = new Request(url, { method: req.method, headers, ...req.method === "POST" ? { body } : {} });
    const response = await routes[endpoint][req.method](request);
    for (const [key, value] of response.headers) res.setHeader(key, value);
    return res.status(response.status).send(await response.text());
  } catch (error) {
    console.error("ClassSync API request failed:", error.name);
    return res.status(503).json({ error: "Classroom service unavailable. Please retry." });
  }
}
export {
  handler as default
};
