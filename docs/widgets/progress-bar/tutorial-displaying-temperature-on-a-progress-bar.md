# Tutorial: Displaying temperature on a progress bar

The [Progress bar](./) widget can be configured to display a temperature. This does require some additional configuration using flows.&#x20;

A progress bar displays values within a specified range, such as 50% within a range of 0 to 100. By default, the progress bar does not have a predefined range, so you'll need to set one up to represent the temperature.

{% stepper %}
{% step %}
### Determine the temperature range

Determine the temperature range by deciding on the lowest and highest possible values. For example, you might choose -15 °C as the minimum and 50 °C as the maximum, depending on the range you want to display.
{% endstep %}

{% step %}
### Create a flow triggered by a temperature change

Open your flow editor and start by creating a new flow. Add an action card for your temperature sensor that is triggered whenever the temperature changes. This ensures the flow activates dynamically based on updates from your sensor.\
\
&#xNAN;_&#x49;f your device doesn’t provide an action card specifically for temperature changes, as an alternative, you can add a card that triggers the flow periodically, such as every 3 minutes, to regularly update the progress bar with the latest temperature._
{% endstep %}

{% step %}
### Set the range and temperature using DataVista

Create an action card using the DataVista range action card to define the range. Link this card to the trigger card from step 2.

<figure><img src="../../.gitbook/assets/action-set-range (3).png" alt=""><figcaption></figcaption></figure>

1. Choose an identifier for this temperature range, such as "Living Room Temperature". This will be used later as a datasource in the widget to display the temperature on your progress bar.
2. Set the minimum and maximum values based on the range you determined in step 1.
3. Then, set the value to the current temperature by selecting the appropriate temperature token.
4. Set the units to "°C" and configure it to display the unit after the value. This will ensure the °C symbol is shown after the value on the progress bar, making it clear that the displayed value represents a temperature.
5. Do not overwrite the label, unless you prefer to display a fixed value instead of the actual temperature. For example, you could use labels like "Cold," "Warm," or "Hot" to represent different temperature ranges.
{% endstep %}

{% step %}
### Save and run the flow

Save the flow, ensure it is enabled, and verify that it has run at least once. This will allow the DataVista range to be properly set and become usable in your widget.
{% endstep %}

{% step %}
### Add the widget to your dashboard

Finally, follow the steps outlined in "[Progress Bar - Adding the widget to your dashboard](./#adding-the-widget-to-your-dashboard)" and select the DataVista identifier you created in step 3.1 as the datasource for your widget. This will link the temperature range to the progress bar for dynamic display.
{% endstep %}
{% endstepper %}





