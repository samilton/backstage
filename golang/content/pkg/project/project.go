package ${{ values.name }}

import (
    fmt
)

func SayHello(name string) {
    fmt.Printf("Hello %s", name)
}