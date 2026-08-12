# Contour-Colorimetric Method for Chemical Kinetics

> [!warning] Operation Guide：
> 
> 1.  Click **`Load Example Image`** below the upload widget to load a built-in sample image.
> 
> 2.  After the image loads, follow the on-screen instructions to crop the region of interest and tune the contour parameters.
> 
> 3.  Once the contours look correct, click **`Download Data`** to export the per-circle mean and standard deviation of R/G/B as an xlsx file.

## Business Background

This sub-business of the Computer Vision for Chemical Kinetics project addresses the need to identify the sample profile and obtain accurate color regions when performing colorimetric operations on batch data. The component is designed for the teaching experiments of Hu Ying and Xi Junting.

With the help of the OpenCV.js computer vision library, the following operations are realized:

- Image reading
- Binarization processing
- Contour detection
- Contour area / center coordinate calculation
- Data export of contour area and center coordinates

## Experimental Procedure

1.  **Upload the sample image** of the chemical kinetics reaction.
2.  **Crop the image** to focus on the region of interest. The cropping can be repeated until the region is right.
3.  **Tune the contour parameters** (binary threshold, area filter rate, diameter scaling) while previewing the detected contours in real time.
4.  **Download the data** as an xlsx file containing per-circle R/G/B mean and standard deviation.

<!-- <ClientOnly> -->
<OutlineColorimetric />
<!-- </ClientOnly> -->
