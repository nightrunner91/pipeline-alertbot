module.exports = {
  repos: [
    {
      projectId: 1,
      projectName: "Test Project",
      chatId: "-1001234567890",
      secret: "test-secret-uuid-here",
      style: "tree",
      notifyRules: {
        build:  { send: ["success", "failed", "running"], ignore: ["canceled", "pending", "manual"] },
        deploy: { send: ["success", "failed"], ignore: [] },
        test:   { send: ["failed"], ignore: [] }
      },
      deployLinks: {
        build:  { url: "", name: "" },
        deploy: { url: "https://test-project.example.com", name: "Open Site" },
        test:   { url: "", name: "" }
      }
    }
  ]
};
