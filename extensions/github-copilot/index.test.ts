import { describe, expect, it, vi } from "vitest";
import { createTestPluginApi } from "../../test/helpers/plugins/plugin-api.js";

const resolveCopilotApiTokenMock = vi.hoisted(() => vi.fn());

vi.mock("./register.runtime.js", () => ({
  DEFAULT_COPILOT_API_BASE_URL: "https://api.githubcopilot.test",
  resolveCopilotApiToken: resolveCopilotApiTokenMock,
  githubCopilotLoginCommand: vi.fn(),
  fetchCopilotUsage: vi.fn(),
}));

import plugin from "./index.js";

function _registerProvider() {
  return registerProviderWithPluginConfig({});
}

function registerProviderWithPluginConfig(pluginConfig: Record<string, unknown>) {
  const registerProviderMock = vi.fn();

  plugin.register(
    createTestPluginApi({
      id: "github-copilot",
      name: "GitHub Copilot",
      source: "test",
      config: {},
      pluginConfig,
      runtime: {} as never,
      registerProvider: registerProviderMock,
    }),
  );

  expect(registerProviderMock).toHaveBeenCalledTimes(1);
  return registerProviderMock.mock.calls[0]?.[0];
}

describe("github-copilot plugin", () => {
  it("registers embedding provider", () => {
    const registerMemoryEmbeddingProviderMock = vi.fn();

    plugin.register(
      createTestPluginApi({
        id: "github-copilot",
        name: "GitHub Copilot",
        source: "test",
        config: {},
        pluginConfig: {},
        runtime: {} as never,
        registerProvider: vi.fn(),
        registerMemoryEmbeddingProvider: registerMemoryEmbeddingProviderMock,
      }),
    );

    expect(registerMemoryEmbeddingProviderMock).toHaveBeenCalledTimes(1);
    const adapter = registerMemoryEmbeddingProviderMock.mock.calls[0]?.[0];
    expect(adapter.id).toBe("github-copilot");
  });

  it("supportsXHighThinking returns true for GPT-5.x models only", () => {
    const provider = _registerProvider();
    expect(provider.supportsXHighThinking({ modelId: "gpt-5.4" })).toBe(true);
    expect(provider.supportsXHighThinking({ modelId: "gpt-5.2" })).toBe(true);
    expect(provider.supportsXHighThinking({ modelId: "claude-opus-4.6" })).toBe(false);
    expect(provider.supportsXHighThinking({ modelId: "gpt-4o" })).toBe(false);
  });

  it("skips catalog discovery when plugin discovery is disabled", async () => {
    const provider = registerProviderWithPluginConfig({ discovery: { enabled: false } });

    const result = await provider.catalog.run({
      config: {},
      agentDir: "/tmp/agent",
      env: { GH_TOKEN: "gh_test_token" },
      resolveProviderApiKey: () => ({ apiKey: "gh_test_token" }),
    } as never);

    expect(result).toBeNull();
    expect(resolveCopilotApiTokenMock).not.toHaveBeenCalled();
  });
});
