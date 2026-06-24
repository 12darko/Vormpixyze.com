using System.Collections.Concurrent;
using System.Collections.Generic;

namespace backend.Services
{
    public class ModeConfig
    {
        public string Key { get; set; } = string.Empty;
        public string GroupName { get; set; } = string.Empty;
        public double MatchDurationSec { get; set; } = 0; // 0 = endless
    }

    // Holds one GameEngine per mode ("room") and routes each connection to its engine.
    // Same engine, different rule-sets — the "one engine, parameter sets" architecture.
    public class GameManager
    {
        private readonly Dictionary<string, GameEngine> _engines = new();
        private readonly Dictionary<string, ModeConfig> _configs = new();
        private readonly ConcurrentDictionary<string, string> _connectionMode = new();

        public GameManager()
        {
            Register("outbreak", "room_outbreak", 0);    // endless FFA
            Register("blitz", "room_blitz", 300);        // 5-minute ranked match
        }

        private void Register(string key, string group, double duration)
        {
            _engines[key] = new GameEngine
            {
                MatchDurationSec = duration,
                MatchTimeRemaining = duration
            };
            _configs[key] = new ModeConfig { Key = key, GroupName = group, MatchDurationSec = duration };
        }

        public IReadOnlyDictionary<string, GameEngine> Engines => _engines;

        public ModeConfig Config(string key) =>
            _configs.TryGetValue(key, out var c) ? c : _configs["outbreak"];

        public string Normalize(string? mode) =>
            !string.IsNullOrEmpty(mode) && _engines.ContainsKey(mode) ? mode : "outbreak";

        public GameEngine GetEngine(string? mode) => _engines[Normalize(mode)];

        public void SetConnectionMode(string connectionId, string mode) =>
            _connectionMode[connectionId] = Normalize(mode);

        public GameEngine EngineForConnection(string connectionId) =>
            _connectionMode.TryGetValue(connectionId, out var m) ? _engines[m] : _engines["outbreak"];

        public void RemoveConnection(string connectionId) =>
            _connectionMode.TryRemove(connectionId, out _);
    }
}
