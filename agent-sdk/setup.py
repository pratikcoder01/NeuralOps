from setuptools import setup, find_packages

setup(
    name="neuralops-agent",
    version="1.0.0",
    description="Python Telemetry Agent SDK for NeuralOps Platform",
    author="NeuralOps Team",
    packages=find_packages(),
    install_packages=[
        "requests>=2.25.0",
        "psutil>=5.8.0",
    ],
    classifiers=[
        "Programming Language :: Python :: 3",
        "Operating System :: OS Independent",
    ],
    python_requires=">=3.8",
)
