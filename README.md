# tree-sitter-oml

[Tree-sitter](https://tree-sitter.github.io/tree-sitter/) grammar for **OML (Output Mapping Language)** — a domain-specific language for data extraction, transformation, and mapping.

## Overview

OML defines declarative rules that map source data to target fields. It supports piping, pattern matching, SQL lookups, object/array aggregation, type casting, and privacy masking, making it suitable for log processing, ETL pipelines, and data normalization tasks.

## Document Structure

An OML file is divided into sections separated by `---`:

```
<header>
---
<static blocks>
<mapping rules>
---
<privacy configuration>
```

- **Header** — declares the mapping name, matching rule, and enable flag
- **Static blocks** — compile-time constants
- **Mapping rules** — the main data transformation logic
- **Privacy section** — optional field-level privacy masking

## Language Features

### Header

```oml
name : csv_example
rule : /csv/data
enable : true
```

### Data Extraction

```oml
# read from source field
host = read(hostname) ;

# read with fallback default
pos_sn = read() { _ : chars(FALLBACK) } ;

# take from parsed output
* = take() ;

# json path
deep = read(/user/info/name) ;

# option: try multiple keys
value = read(option:[id, uid, user_id]) ;
```

### Pipe Expressions

Chain transformations with the `|` operator:

```oml
url_host = read(http_url) | url(host) ;
ts = read(time) | Time::to_ts_zone(0, ms) ;
result = pipe @data | to_json | base64_encode ;
is_http = read(url) | starts_with('http://') ;
first_port = pipe read(ports) | nth(0) ;
```

Available pipe functions: `nth()`, `get()`, `url()`, `path()`, `base64_decode()`, `base64_encode`, `starts_with()`, `map_to()`, `Time::to_ts`, `Time::to_ts_ms`, `Time::to_ts_us`, `Time::to_ts_zone()`, `to_json`, `to_str`, `skip_empty`, `ip4_to_int`, `html_escape`, `html_unescape`, `str_escape`, `json_escape`, `json_unescape`, `extract_main_word`, `extract_subject_object`.

### Format Expressions

```oml
message = fmt("{}-{}", @user, read(city)) ;
id = fmt("{}:{}", read(host), read(port)) ;
```

### Object Aggregation

```oml
values : obj = object {
    cpu_free, memory_free : digit = read() ;
} ;
```

### Array Collection

```oml
ports : array = collect read(keys:[sport, dport]) ;
```

### Pattern Matching

Single source:

```oml
quarter : chars = match read(month) {
    in (digit(1), digit(3))   => chars(Q1) ;
    in (digit(4), digit(6))   => chars(Q2) ;
    _ => chars(QX) ;
} ;
```

Multi source:

```oml
zone : chars = match (read(city), read(region), read(country)) {
    (chars(bj), chars(north), chars(cn)) => chars(zone1) ;
    (chars(sh), chars(east), chars(cn))  => chars(zone2) ;
    _ => chars(unknown) ;
} ;
```

OR conditions:

```oml
tier : chars = match read(city) {
    chars(bj) | chars(sh) | chars(gz) => chars(tier1) ;
    chars(cd) | chars(wh) => chars(tier2) ;
    _ => chars(other) ;
} ;
```

Match functions: `starts_with()`, `ends_with()`, `contains()`, `regex_match()`, `iequals()`, `is_empty()`, `gt()`, `lt()`, `eq()`, `in_range()`, `in()`.

### SQL Lookups

```oml
name, pinying = select name, pinying from example where pinying = read(py) ;
```

### Data Types

`auto`, `chars`, `digit`, `float`, `bool`, `ip`, `ip_net`, `domain`, `url`, `time`, `time_iso`, `time_3339`, `time_2822`, `time_timestamp`, `time_clf`, `time/<format>`, `array`, `array/<type>`, `obj`, `json`, `kv`, `base64`.

### Privacy Masking

```oml
---
src_ip : privacy_ip
pos_sn : privacy_keymsg
```

Privacy types: `privacy_ip`, `privacy_specify_ip`, `privacy_id_card`, `privacy_mobile`, `privacy_mail`, `privacy_domain`, `privacy_specify_domain`, `privacy_specify_name`, `privacy_specify_address`, `privacy_specify_company`, `privacy_keymsg`.

## Usage

### Rust

Add to your `Cargo.toml`:

```toml
[dependencies]
tree-sitter = ">=0.22.6"
tree-sitter-oml = "0.2.0"
```

```rust
let language = tree_sitter_oml::language();
let mut parser = tree_sitter::Parser::new();
parser.set_language(&language).unwrap();

let source = "name : example\n---\nhost = read(hostname) ;";
let tree = parser.parse(source, None).unwrap();
println!("{}", tree.root_node().to_sexp());
```

### Node.js

```javascript
const Parser = require("tree-sitter");
const OML = require("tree-sitter-oml");

const parser = new Parser();
parser.setLanguage(OML);

const tree = parser.parse("name : example\n---\nhost = read(hostname) ;");
console.log(tree.rootNode.toString());
```

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) (for `tree-sitter-cli`)
- [Rust toolchain](https://rustup.rs/) (for building the Rust binding)

### Building

```bash
# Install dependencies
npm install

# Generate the parser from grammar.js
npx tree-sitter generate

# Run tests
npx tree-sitter test

# Build the Rust binding
cargo build

# Run Rust tests
cargo test
```

### Project Structure

```
tree-sitter-oml/
├── grammar.js            # Grammar definition
├── queries/
│   └── highlights.scm    # Syntax highlighting queries
├── bindings/
│   └── rust/             # Rust language binding
├── src/
│   ├── parser.c          # Generated parser
│   ├── grammar.json      # Generated grammar schema
│   └── node-types.json   # AST node type definitions
├── examples/
│   ├── test.oml          # Example: comprehensive features
│   └── test2.oml         # Example: format and pipe operations
├── Cargo.toml            # Rust package manifest
├── package.json          # Node.js package manifest
└── tree-sitter.json      # Tree-sitter configuration
```

## Editor Support

### Zed

The `queries/highlights.scm` file provides syntax highlighting for the [Zed editor](https://zed.dev/). See the companion Zed extension for integration.

## License

Apache License 2.0 — see [LICENSE](LICENSE) for details.
