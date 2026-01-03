---
sidebar_position: 6
title: Line Chart
---

# Line Chart

The **Line Chart** widget compares up to two Homey insights in a single graph so you can spot correlations, trends, or outliers. Click any point to open a tooltip with detailed values.

![Line chart animation](/img/docs/line-chart-widget-animation.gif)

Currently the widget visualizes Homey insights.

## Add the widget to your dashboard

1. Open the Homey app and go to **Dashboards**.
2. Enter **Edit Mode** and select **Add Widget**.
3. Choose **Apps** and select **DataVista**.
4. Pick the **Line chart** widget.
5. Click the preview to add it to your dashboard.

![Line chart widget preview](/img/docs/line-chart-widget-preview.png)

## Configure the widget

| Setting | Description |
| --- | --- |
| **Timeframe** | Choose a fixed period (hour, day, week, month, year) or a rolling window (60 minutes, 24 hours, 7 days, 31 days, 365 days). |
| **Datasource 1** | Select the first Homey insight series. |
| **Period 1** | Choose whether to show the current or previous period relative to the timeframe. |
| **Color 1** | Line color for datasource 1. |
| **Overwrite name 1** | Optional label override for datasource 1. |
| **Datasource 2** | (Optional) Select a second Homey insight series for comparison. |
| **Period 2** | Choose current or previous period for datasource 2. |
| **Color 2** | Line color for datasource 2. |
| **Overwrite name 2** | Optional label override for datasource 2. |
| **Show icon** | Display the capability or device icon (capability takes priority). |
| **Show refresh countdown** | Display a progress bar that counts down to the next data refresh. |
| **Y axis calculation method** | Pick **Full range**, **Interquartile Range (IQR)**, or **Force same axis** to control how the Y axis is calculated and whether a second axis appears. |
| **Hide legend** | Hide the legend (disables per-series toggles). |
| **Tooltip font size** | Select **Small**, **Normal**, **Large**, or **Extra large** for tooltip text. |

## FAQ

### How can I show only one data source?

Leave **Datasource 2** empty and set **Period 2** to the same value as **Period 1**.

### How do I compare this period against the previous one?

Use the same datasource for both entries, leave **Datasource 2** empty, and set **Period 2** to **Previous**.

### How do I use rolling timeframes?

Pick one of the rolling options (for example **60 minutes** or **7 days**). Fixed periods (such as **day** or **month**) follow calendar boundaries.

### What does "Y axis calculation method" do?

- **Full range** uses the full dataset range to determine axis bounds.
- **Interquartile Range (IQR)** trims outliers before calculating bounds.
- **Force same axis** applies a single axis to both datasets.

### Does the chart refresh automatically?

Yes, it refreshes in line with the corresponding Homey insights update cadence.

### How do I close a tooltip?

Click the X-axis or Y-axis to dismiss the tooltip.
