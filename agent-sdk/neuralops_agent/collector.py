import os
import time
import psutil
from typing import Dict, Any, Optional
from neuralops_agent import agent

class MetricsCollector:
    def __init__(self):
        self.last_disk_io: Optional[Any] = None
        self.last_net_io: Optional[Any] = None
        self.last_time: float = time.time()
        
        # Trigger initial readings so cpu_percent(interval=None) returns real deltas next time
        psutil.cpu_percent(percpu=True, interval=None)
        
    def collect(self) -> Dict[str, Any]:
        """
        Collects system resource telemetry metrics and runs active custom plugins.
        """
        now = time.time()
        
        # 1. CPU
        cpu_cores = psutil.cpu_percent(percpu=True, interval=None)
        cpu_freq_info = psutil.cpu_freq()
        cpu_freq = cpu_freq_info.current if cpu_freq_info else 0.0

        # 2. Memory
        mem = psutil.virtual_memory()
        
        # 3. Swap
        swap = psutil.swap_memory()

        # 4. Disk Usage
        disk_usage = psutil.disk_usage('/')
        
        # 5. Disk IO Deltas
        disk_io = psutil.disk_io_counters()
        disk_read_bytes_delta = 0
        disk_write_bytes_delta = 0
        if disk_io:
            if self.last_disk_io:
                disk_read_bytes_delta = max(0, disk_io.read_bytes - self.last_disk_io.read_bytes)
                disk_write_bytes_delta = max(0, disk_io.write_bytes - self.last_disk_io.write_bytes)
            self.last_disk_io = disk_io

        # 6. Network Deltas
        net_io = psutil.net_io_counters()
        net_bytes_recv_delta = 0
        net_bytes_sent_delta = 0
        if net_io:
            if self.last_net_io:
                net_bytes_recv_delta = max(0, net_io.bytes_recv - self.last_net_io.bytes_recv)
                net_bytes_sent_delta = max(0, net_io.bytes_sent - self.last_net_io.bytes_sent)
            self.last_net_io = net_io

        # 7. Processes count
        try:
            process_count = len(psutil.pids())
        except Exception:
            process_count = 0

        # 8. Load averages
        load_avg = (0.0, 0.0, 0.0)
        if hasattr(os, "getloadavg"):
            try:
                load_avg = os.getloadavg()
            except Exception:
                pass

        # 9. Custom Plugins
        custom_metrics = {}
        for name, plugin_instance in agent.get_plugins().items():
            try:
                custom_metrics[name] = plugin_instance.collect()
            except Exception as e:
                custom_metrics[name] = {"error": str(e)}

        self.last_time = now

        return {
            "timestamp": int(now),
            "cpu": {
                "cores": cpu_cores,
                "frequency_mhz": cpu_freq
            },
            "memory": {
                "total": mem.total,
                "used": mem.used,
                "available": mem.available,
                "percent": mem.percent
            },
            "swap": {
                "total": swap.total,
                "used": swap.used,
                "percent": swap.percent
            },
            "disk": {
                "total": disk_usage.total,
                "used": disk_usage.used,
                "percent": disk_usage.percent,
                "read_bytes_delta": disk_read_bytes_delta,
                "write_bytes_delta": disk_write_bytes_delta
            },
            "network": {
                "bytes_recv_delta": net_bytes_recv_delta,
                "bytes_sent_delta": net_bytes_sent_delta
            },
            "processes": {
                "count": process_count
            },
            "load_average": {
                "1m": load_avg[0],
                "5m": load_avg[1],
                "15m": load_avg[2]
            },
            "custom": custom_metrics
        }
