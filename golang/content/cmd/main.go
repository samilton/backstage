package main

import (
    "stash.elliottmgmt.com/${{ values.name }}/pkg/${{ values.name }}"
)

func main() {
    SayGreeting("${{ values.name }}")
}
