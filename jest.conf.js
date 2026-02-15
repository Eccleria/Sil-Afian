export default {
    collectCoverage: true,
    collectCoverageFrom: [
        "**/*.js",
        "!**/node_modules/**"
    ],
    extensionsToTreatAsEsm: [".js"],
    globals: {
        "jest": true,
    },  
    moduleNameMapper: {
        "^discord.js$": "<rootDir>/__mocks__/discord.js.js",  // Utilisation d'un mock personnalisé pour discord.js
    },
    testEnvironment: 'jest-environment-node',
    transform: {
      "^.+\\.js$": "babel-jest",
    },
    transformIgnorePatterns: ['/node_modules/(?!discord-api-types)', '/node_modules/(?!ewilib)'],
}
