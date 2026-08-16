# Contact angle image processing assistant

<script setup>
// Note: After removing .md from the Components include, .md files can no longer
// auto-resolve <Xxx /> globally; explicit import is required.
// This is the standard pattern for VitePress .md files when unplugin-vue-components
// does not scan .md files.
import ContactAngle from './ContactAngle.vue'
</script>

> [!warning] The main demands addressed by this business are:
> 
> After the contact angle measurement, various processing operations need to be carried out on the image to ultimately obtain the contact angle data.
>
> Link to the tutorial document for this business: [**Contact angle Image Processing Tutorial**](index.md#_3-droplet-image-processing)
> 
> Also: [**Vertical Calibration Function Link**](vertical-calibration.md)

## Droplet image processing

<!-- Contact angle processing component -->
<ContactAngle />
