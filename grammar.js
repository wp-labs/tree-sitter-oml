/// <reference types="tree-sitter-cli/dsl" />

module.exports = grammar({
  name: "oml",

  extras: ($) => [/\s/, $.comment],

  word: ($) => $.identifier,


  rules: {
    source_file: ($) =>
      seq(
        $.header,
        $.separator,
        optional($.aggregate_section),
        optional(seq($.separator, optional($.privacy_section))),
      ),

    // ── Comments ──────────────────────────────────────────────────
    comment: (_$) =>
      token(choice(seq("#", /.*/), seq("//", /.*/))),

    // ── Header ────────────────────────────────────────────────────
    header: ($) =>
      seq($.name_field, optional($.rule_field)),

    name_field: ($) =>
      seq("name", ":", field("name", $.path)),

    rule_field: ($) =>
      seq("rule", ":", field("path", $.rule_path), repeat(seq(",", $.rule_path))),

    // ── Separator ─────────────────────────────────────────────────
    separator: (_$) => "---",

    // ── Aggregate section ─────────────────────────────────────────
    aggregate_section: ($) => repeat1($.aggregate_item),

    aggregate_item: ($) =>
      seq($.target_list, "=", $._eval, ";"),

    target_list: ($) =>
      seq($.target, repeat(seq(",", $.target))),

    target: ($) =>
      seq(
        field("name", $.target_name),
        optional(seq(":", field("type", $.data_type))),
      ),

    target_name: ($) => choice($.wild_key, "_"),

    // ── Data types ────────────────────────────────────────────────
    data_type: ($) =>
      choice(
        "auto", "ip", "chars", "digit", "float",
        "time", "bool", "obj", "array",
      ),

    // ── Eval expressions ──────────────────────────────────────────
    _eval: ($) =>
      choice(
        $.pipe_expr,
        $.take_expr,
        $.read_expr,
        $.fmt_expr,
        $.object_expr,
        $.collect_expr,
        $.match_expr,
        $.sql_expr,
        $.value_expr,
        $.fun_call,
      ),

    // ── Take / Read ───────────────────────────────────────────────
    take_expr: ($) =>
      seq("take", "(", optional($.arg_list), ")", optional($.default_body)),

    read_expr: ($) =>
      seq("read", "(", optional($.arg_list), ")", optional($.default_body)),

    arg_list: ($) =>
      seq($._arg, repeat(seq(",", $._arg))),

    _arg: ($) =>
      choice($.option_arg, $.keys_arg, $.get_arg, $.json_path, $.identifier),

    option_arg: ($) =>
      seq("option", ":", "[", $.identifier, repeat(seq(",", $.identifier)), "]"),

    keys_arg: ($) =>
      seq(choice("in", "keys"), ":", "[", $.key_item, repeat(seq(",", $.key_item)), "]"),

    key_item: ($) => $.wild_key,

    get_arg: ($) =>
      seq("get", ":", choice($.identifier, $.number, $.string)),

    default_body: ($) =>
      seq("{", "_", ":", $._gen_acq, optional(";"), "}"),

    _gen_acq: ($) =>
      choice($.take_expr, $.read_expr, $.value_expr, $.fun_call),

    // ── Value expression ──────────────────────────────────────────
    value_expr: ($) =>
      prec(2, seq($.data_type, "(", $._literal, ")")),

    _literal: ($) =>
      choice($.string, $.number, $.ip_literal, $.boolean, $.identifier),

    // ── Function call ─────────────────────────────────────────────
    fun_call: ($) =>
      seq(
        field("function", choice("Now::time", "Now::date", "Now::hour")),
        "(", ")",
      ),

    // ── Fmt expression ────────────────────────────────────────────
    fmt_expr: ($) =>
      seq(
        "fmt", "(",
        $.string, ",",
        $.var_get, repeat(seq(",", $.var_get)),
        ")",
      ),

    // ── Pipe expression ───────────────────────────────────────────
    pipe_expr: ($) =>
      prec(3, seq(
        optional("pipe"),
        $.var_get,
        "|", $.pipe_fun,
        repeat(seq("|", $.pipe_fun)),
      )),

    pipe_fun: ($) =>
      choice(
        seq("nth", "(", $.number, ")"),
        seq("get", "(", $.identifier, ")"),
        seq("base64_decode", "(", optional($.identifier), ")"),
        seq("path", "(", choice("name", "path"), ")"),
        seq("url", "(", choice("domain", "host", "uri", "path", "params"), ")"),
        seq("Time::to_ts_zone", "(", optional("-"), $.number, ",", choice("ms", "us", "ss", "s"), ")"),
        seq("starts_with", "(", $.string, ")"),
        seq("map_to", "(", choice($.string, $.number, $.boolean), ")"),
        "base64_encode",
        "html_escape",
        "html_unescape",
        "str_escape",
        "str_unescape",
        "json_escape",
        "json_unescape",
        "Time::to_ts",
        "Time::to_ts_ms",
        "Time::to_ts_us",
        "to_json",
        "to_str",
        "skip_empty",
        "ip4_to_int",
        "extract_main_word",
        "extract_subject_object",
      ),

    // ── Var get ───────────────────────────────────────────────────
    var_get: ($) =>
      choice(
        seq("read", "(", optional($.arg_list), ")"),
        seq("take", "(", optional($.arg_list), ")"),
        $.at_ref,
      ),

    at_ref: ($) => seq("@", $.identifier),

    // ── Object expression ─────────────────────────────────────────
    object_expr: ($) =>
      seq("object", "{", repeat1($.map_item), "}"),

    map_item: ($) =>
      seq($.map_targets, "=", $._sub_acq, optional(";")),

    map_targets: ($) =>
      seq(
        $.identifier,
        repeat(seq(",", $.identifier)),
        optional(seq(":", $.data_type)),
      ),

    _sub_acq: ($) =>
      choice($.take_expr, $.read_expr, $.value_expr, $.fun_call),

    // ── Collect expression ────────────────────────────────────────
    collect_expr: ($) =>
      seq("collect", $.var_get),

    // ── Match expression ──────────────────────────────────────────
    match_expr: ($) =>
      choice(
        // Single source
        seq(
          "match", $.var_get, "{",
          repeat1($.case_arm),
          optional($.default_arm),
          "}",
        ),
        // Multi source
        seq(
          "match", "(",
          $.var_get, ",", $.var_get, repeat(seq(",", $.var_get)),
          ")", "{",
          repeat1($.multi_case_arm),
          optional($.default_arm),
          "}",
        ),
      ),

    case_arm: ($) =>
      seq($.condition, "=>", $._calc, optional(","), optional(";")),

    multi_case_arm: ($) =>
      seq(
        "(", $.condition, ",", $.condition, repeat(seq(",", $.condition)), ")",
        "=>", $._calc, optional(","), optional(";"),
      ),

    default_arm: ($) =>
      seq("_", "=>", $._calc, optional(","), optional(";")),

    _calc: ($) =>
      choice($.read_expr, $.take_expr, $.value_expr, $.collect_expr),

    condition: ($) =>
      seq($._cond_atom, repeat(seq("|", $._cond_atom))),

    _cond_atom: ($) =>
      choice(
        $.in_condition,
        $.not_condition,
        $.value_expr,
      ),

    in_condition: ($) =>
      seq("in", "(", $.value_expr, ",", $.value_expr, ")"),

    not_condition: ($) =>
      seq("!", $.value_expr),

    // ── SQL expression ────────────────────────────────────────────
    sql_expr: ($) =>
      seq(
        "select", $.sql_columns, "from", $.identifier,
        "where", $.sql_condition,
      ),

    sql_columns: ($) =>
      choice(
        "*",
        seq($.identifier, repeat(seq(",", $.identifier))),
      ),

    sql_condition: ($) =>
      seq($._sql_cond_expr, repeat(seq(choice("and", "or"), $._sql_cond_expr))),

    _sql_cond_expr: ($) =>
      choice(
        $.sql_comparison,
        seq("not", $._sql_cond_expr),
        seq("(", $.sql_condition, ")"),
      ),

    sql_comparison: ($) =>
      seq(
        choice($.identifier, seq($.identifier, "(", $.var_get, ")")),
        choice("=", "!=", "<", ">", "<=", ">="),
        choice($.read_expr, $.take_expr, $.fun_call, $.string, $.number,
               seq($.identifier, "(", $.var_get, ")")),
      ),

    // ── Privacy section ───────────────────────────────────────────
    privacy_section: ($) => repeat1($.privacy_item),

    privacy_item: ($) =>
      seq(field("name", $.identifier), ":", field("type", $.privacy_type)),

    privacy_type: (_$) =>
      choice(
        "privacy_ip",
        "privacy_specify_ip",
        "privacy_id_card",
        "privacy_mobile",
        "privacy_mail",
        "privacy_domain",
        "privacy_specify_name",
        "privacy_specify_domain",
        "privacy_specify_address",
        "privacy_specify_company",
        "privacy_keymsg",
      ),

    // ── Paths and identifiers ─────────────────────────────────────
    rule_path: (_$) => /[A-Za-z0-9_.\/*-]+/,

    path: ($) =>
      seq($.identifier, repeat(seq(choice("/", "."), $.identifier))),

    wild_path: ($) =>
      seq($.path, optional("*")),

    wild_key: (_$) => /[a-zA-Z_][a-zA-Z0-9_]*\*?|\*/,

    json_path: (_$) => /\/[a-zA-Z0-9_/\[\].*-]+/,

    // ── Literals ──────────────────────────────────────────────────
    string: (_$) =>
      token(choice(
        seq('"', repeat(choice(/[^"\\]/, /\\./)), '"'),
        seq("'", repeat(choice(/[^'\\]/, /\\./)), "'"),
      )),

    number: (_$) => /\d+(\.\d+)?/,

    ip_literal: (_$) => /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/,

    boolean: (_$) => choice("true", "false"),

    identifier: (_$) => /[a-zA-Z_][a-zA-Z0-9_]*/,
  },
});
