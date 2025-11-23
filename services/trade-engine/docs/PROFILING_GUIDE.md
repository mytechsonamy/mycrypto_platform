# Performance Profiling Guide

## Overview

This guide covers performance profiling techniques for the Trade Engine using Go's built-in profiling tools.

## Quick Start

```bash
# Navigate to project root
cd /Users/musti/Documents/Projects/MyCrypto_Platform/services/trade-engine

# Run all benchmarks with profiling
go test -bench=. -benchmem -cpuprofile=cpu.prof -memprofile=mem.prof ./benchmarks/

# Run specific benchmark
go test -bench=BenchmarkMatchingEngine_PlaceOrder -benchmem ./benchmarks/
```

## CPU Profiling

### Generate CPU Profile

```bash
# Run benchmarks with CPU profiling
go test -bench=. -cpuprofile=cpu.prof ./benchmarks/

# Analyze with pprof (interactive mode)
go tool pprof cpu.prof

# Generate text report
go tool pprof -text cpu.prof > cpu_profile.txt

# Generate top 20 functions
go tool pprof -top cpu.prof

# Generate graph (requires graphviz)
go tool pprof -pdf cpu.prof > cpu_profile.pdf
```

### CPU Profile Analysis

Look for:
- Functions consuming >5% CPU time
- Frequent function calls (high call count)
- Deep call stacks
- Unexpected bottlenecks

**Common Commands in pprof:**
```
top       # Show top functions by CPU time
top20     # Show top 20 functions
list FUNC # Show source code for function
web       # Open interactive graph in browser
```

## Memory Profiling

### Generate Memory Profile

```bash
# Run benchmarks with memory profiling
go test -bench=. -memprofile=mem.prof ./benchmarks/

# Analyze memory allocations
go tool pprof mem.prof

# Generate text report
go tool pprof -text mem.prof > mem_profile.txt

# Show allocation sites
go tool pprof -alloc_space mem.prof

# Show objects currently in memory
go tool pprof -inuse_space mem.prof
```

### Memory Profile Analysis

Look for:
- High allocation counts
- Large allocation sizes
- Memory leaks (continuously growing)
- Inefficient data structures
- Excessive slice/map reallocations

**Memory Metrics:**
- `alloc_space`: Total allocations (including freed)
- `alloc_objects`: Number of allocations
- `inuse_space`: Currently allocated memory
- `inuse_objects`: Currently allocated objects

## Trace Analysis

### Generate Execution Trace

```bash
# Generate trace
go test -trace=trace.out ./benchmarks/

# View trace in browser
go tool trace trace.out
```

### Trace Analysis Features

- **Goroutine Analysis**: Concurrency patterns
- **Network I/O**: HTTP request timing
- **Synchronization**: Mutex contention
- **GC Events**: Garbage collection impact
- **Syscalls**: System call overhead

## Benchmark Comparison

### Using benchstat

```bash
# Install benchstat
go install golang.org/x/perf/cmd/benchstat@latest

# Run baseline
go test -bench=. -benchmem ./benchmarks/ > baseline.txt

# Make optimizations...

# Run optimized
go test -bench=. -benchmem ./benchmarks/ > optimized.txt

# Compare
benchstat baseline.txt optimized.txt
```

## Common Performance Patterns

### 1. High Allocation Rate

**Symptoms:**
- High `B/op` (bytes per operation)
- High `allocs/op` (allocations per operation)
- Frequent GC pauses

**Solutions:**
- Object pooling (sync.Pool)
- Pre-allocate slices with capacity
- Reduce pointer usage
- Use value types where possible

### 2. Lock Contention

**Symptoms:**
- High CPU time in `sync.(*Mutex).Lock`
- Visible in trace analysis
- Poor scaling with goroutines

**Solutions:**
- Reduce lock scope
- Use RWMutex for read-heavy workloads
- Fine-grained locking
- Lock-free data structures

### 3. Excessive Copying

**Symptoms:**
- High CPU in `runtime.memmove`
- Large structures passed by value

**Solutions:**
- Pass pointers instead of values
- Use slices instead of arrays
- Avoid unnecessary copying

### 4. String Concatenation

**Symptoms:**
- High allocations in string operations
- CPU time in `runtime.concatstrings`

**Solutions:**
- Use strings.Builder
- Pre-allocate capacity
- Use fmt.Sprintf strategically

## Profiling Checklist

### Before Profiling
- [ ] Ensure realistic test data
- [ ] Run with sufficient iterations (-benchtime=10s)
- [ ] Use production-like configuration
- [ ] Disable debug logging
- [ ] Close other applications

### During Profiling
- [ ] Generate CPU profile
- [ ] Generate memory profile
- [ ] Run trace analysis (if needed)
- [ ] Document baseline metrics
- [ ] Identify top 5 bottlenecks

### After Optimization
- [ ] Re-run all benchmarks
- [ ] Compare with baseline
- [ ] Verify no regressions
- [ ] Run integration tests
- [ ] Document improvements

## Target Metrics

| Component | Metric | Target | Method |
|-----------|--------|--------|--------|
| Matching Engine | Throughput | >1M matches/sec | Benchmarks |
| Order Placement | Latency | <2.5µs | Benchmarks |
| Order Book Scan | Latency | <50µs | Benchmarks |
| Trade Settlement | Latency | <600µs | Benchmarks |
| Memory | Allocs/op | <50 | -benchmem |
| Memory | Bytes/op | <5KB | -benchmem |

## CI/CD Integration

### Automated Benchmarking

```bash
# Add to CI pipeline
go test -bench=. -benchmem ./benchmarks/ | tee benchmark_results.txt

# Check for regressions (example)
benchstat baseline.txt current.txt | grep -q "slower" && exit 1
```

### Performance Regression Tests

```go
func TestPerformanceRegression(t *testing.T) {
    // Ensure no major regressions
    result := testing.Benchmark(BenchmarkMatchingEngine_PlaceOrder)

    maxNsPerOp := int64(3000) // 3µs max
    if result.NsPerOp() > maxNsPerOp {
        t.Errorf("Performance regression: %d ns/op > %d ns/op",
            result.NsPerOp(), maxNsPerOp)
    }
}
```

## Troubleshooting

### Profile is Empty
- Increase benchmark time: `-benchtime=10s`
- Check if code is actually running
- Verify profile file was created

### pprof Shows No Data
- Ensure sufficient CPU activity
- Use `-cpuprofile` flag correctly
- Check file permissions

### Inconsistent Results
- Run multiple times
- Use `-count=10` for statistics
- Check for background processes
- Disable CPU frequency scaling

## References

- [Go Diagnostics](https://golang.org/doc/diagnostics)
- [pprof Documentation](https://github.com/google/pprof)
- [Go Performance Tips](https://github.com/dgryski/go-perfbook)
- [Profiling Go Programs](https://go.dev/blog/pprof)
