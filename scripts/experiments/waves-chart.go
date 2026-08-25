package main

// Generates a small wave-progress chart PNG for the pane.graphics spike.
import (
	"image"
	"image/color"
	"image/png"
	"os"
)

func main() {
	w, h := 480, 160
	img := image.NewRGBA(image.Rect(0, 0, w, h))
	bg := color.RGBA{30, 30, 46, 255}       // catppuccin base
	green := color.RGBA{166, 227, 161, 255} // primary
	yellow := color.RGBA{249, 226, 175, 255}
	grey := color.RGBA{69, 71, 90, 255}
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			img.Set(x, y, bg)
		}
	}
	// three wave bars: done, done, in-progress
	bars := []struct {
		frac float64
		col  color.RGBA
	}{{1.0, green}, {1.0, green}, {0.6, yellow}}
	for i, b := range bars {
		y0 := 20 + i*45
		for y := y0; y < y0+28; y++ {
			for x := 20; x < w-20; x++ {
				c := grey
				if float64(x-20) < b.frac*float64(w-40) {
					c = b.col
				}
				img.Set(x, y, c)
			}
		}
	}
	f, _ := os.Create("/tmp/tkexp-gfx/waves.png")
	png.Encode(f, img)
	f.Close()
}
