module.exports = {
  forbidden: [
    { name: "no-cycles", severity: "error", from: {}, to: { circular: true } },
    { name: "no-orphans", severity: "warn", from: {}, to: { orphan: true } },
    {
      name: "pkg-boundaries",
      severity: "error",
      from: { path: "^packages/([^/]+)/" },
      to: {
        path: "^packages/(?!\\1/)[^/]+/",
        moreThanOneDependencyType: false
      }
    }
  ],
  options: { tsConfig: { fileName: "tsconfig.json" } }
};
