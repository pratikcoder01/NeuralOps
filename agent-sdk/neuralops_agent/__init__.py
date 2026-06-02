__version__ = "0.1.0"

class MetricPlugin:
    def collect(self) -> dict:
        raise NotImplementedError("Plugins must implement the collect() method")

class AgentPluginRegistry:
    def __init__(self):
        self._plugins = {}

    def plugin(self, name: str):
        """
        Decorator registering a custom MetricPlugin callback class
        """
        def decorator(cls):
            self._plugins[name] = cls()
            return cls
        return decorator

    def get_plugins(self):
        return self._plugins

agent = AgentPluginRegistry()
