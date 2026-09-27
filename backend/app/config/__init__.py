# config package
try:
    import sys, os
    backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    config_py = os.path.join(backend_dir, "config.py")
    if os.path.isfile(config_py):
        import importlib.util
        spec = importlib.util.spec_from_file_location("_backend_config", config_py)
        if spec and spec.loader:
            mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)
            settings = getattr(mod, "settings", None)
except Exception:
    pass
