module hypersim-conformance-go

go 1.21

require (
	hypersim v1.0.0
	github.com/stretchr/testify v1.8.4
	github.com/shirou/gopsutil/v3 v3.23.8
)

replace hypersim => ../../../go
