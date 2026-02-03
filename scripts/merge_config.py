"""
PlatformIO Pre-Build Script: Merge Device Configs

Merges device-specific config files from configs/picoN/ with shared web UI
files from data/ into a temporary build directory for LittleFS upload.

Usage in platformio.ini:
    extra_scripts = pre:scripts/merge_config.py
    custom_config_dir = configs/pico1
"""

import os
import shutil
from pathlib import Path

Import("env")

def merge_configs(source, target, env):
    """Pre-build hook to merge device configs with shared UI files."""
    
    project_dir = Path(env.get("PROJECT_DIR"))
    
    # Get device-specific config directory from platformio.ini
    config_dir_name = env.GetProjectOption("custom_config_dir", None)
    
    if not config_dir_name:
        print("Warning: No custom_config_dir specified, using default data/")
        return
    
    config_dir = project_dir / config_dir_name
    shared_data_dir = project_dir / "data"
    build_data_dir = project_dir / ".pio" / "build_data" / env.get("PIOENV")
    
    # Validate paths
    if not config_dir.exists():
        print(f"Error: Config directory not found: {config_dir}")
        print(f"Please create the directory with config.json, io_config.json, sensors.json")
        env.Exit(1)
    
    if not shared_data_dir.exists():
        print(f"Error: Shared data directory not found: {shared_data_dir}")
        env.Exit(1)
    
    print(f"Merging configs for environment: {env.get('PIOENV')}")
    print(f"  Device configs: {config_dir}")
    print(f"  Shared UI: {shared_data_dir}")
    print(f"  Build output: {build_data_dir}")
    
    # Clean and create build data directory
    if build_data_dir.exists():
        shutil.rmtree(build_data_dir)
    build_data_dir.mkdir(parents=True, exist_ok=True)
    
    # Copy shared web UI files (html, js, css, ico)
    shared_extensions = {'.html', '.js', '.css', '.ico', '.png', '.svg'}
    for file in shared_data_dir.iterdir():
        if file.is_file() and file.suffix.lower() in shared_extensions:
            shutil.copy2(file, build_data_dir / file.name)
            print(f"  Copied shared: {file.name}")
    
    # Copy device-specific config files (json) - these override any from shared
    for file in config_dir.iterdir():
        if file.is_file() and file.suffix.lower() == '.json':
            shutil.copy2(file, build_data_dir / file.name)
            print(f"  Copied config: {file.name}")
    
    # Update the data directory for LittleFS build
    env.Replace(PROJECTDATA_DIR=str(build_data_dir))
    
    print(f"Config merge complete. LittleFS will use: {build_data_dir}")

# Register the pre-build hook
env.AddPreAction("buildfs", merge_configs)
# Also run for uploadfs target
env.AddPreAction("uploadfs", merge_configs)
