import { jest } from "@jest/globals";

console.log("mock loadé");

const mockedClient = {
  on: jest.fn(),
  login: jest.fn().jestResolvedValue("fake_token"),
  once: jest.fn((event, handler) => {
    if (event == "ready") setImmediate(() => handler());
  }),
  destroy: jest.fn(),
  user: {id: "123"}
}

export const Client = jest.fn(() => mockedClient);

export const GatewayIntentBits = {
  Guilds: 1,
  GuildMembers:2,
  GuildModeration:4,
  GuildExpressions:8,
  GuildIntegrations: 16,
  GuildWebhooks: 32,
  GuildInvites: 64,
  GuildVoiceStates: 128,
  GuildPresences: 256,
  GuildMessages: 512,
  GuildMessageReactions: 1024,
  GuildMessageTyping: 2048,
  DirectMessages: 4096,
  DirectMessageReactions: 8192,
  DirectMessageTyping: 16384,
  MessageContent: 32768,
  GuildScheduledEvents: 65536,
  AutoModerationConfiguration: 1048576,
  AutoModerationExecution: 2097152,
  GuildMessagePolls: 16777216,
  DirectMessagePolls: 33554432
};

export const Partials = {
  User: 1,
  Channel: 2,
  GuildMember: 3,
  Message: 4,
  Reaction: 5,
  GuildScheduledEvent: 6,
  ThreadMember: 7,
}
