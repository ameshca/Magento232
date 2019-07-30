/**
 * Cminds Marketplace checkout cart shipping rates js component.
 *
 * @category Cminds
 * @package  Cminds_Marketplace
 * @author   Piotr Pierzak <piotrek.pierzak@gmail.com>
 */
define(
    [
        'jquery',
        'ko',
        'underscore',
        'uiComponent',
        'Magento_Checkout/js/model/shipping-service',
        'Magento_Catalog/js/price-utils',
        'Magento_Checkout/js/model/quote',
        'Magento_Checkout/js/action/select-shipping-method',
        'Magento_Checkout/js/checkout-data'
    ],
    function (
        $,
        ko,
        _,
        Component,
        shippingService,
        priceUtils,
        quote,
        selectShippingMethodAction,
        checkoutData
    ) {
        'use strict';

        return Component.extend({
            defaults: {
                template: 'Cminds_Marketplace/cart/shipping-rates'
            },
            isVisible: ko.observable(!quote.isVirtual()),
            isLoading: shippingService.isLoading,
            shippingRates: shippingService.getShippingRates(),
            shippingRateGroups: ko.observableArray([]),
            selectedShippingMethod: ko.computed(function () {
                    return quote.shippingMethod() ?
                    quote.shippingMethod()['carrier_code'] + '_' + quote.shippingMethod()['method_code'] :
                        null;
                }
            ),
            supplierData: ko.observable(),
            supplierShippingRates: ko.observable({}),
            shippingMethodsEnabled: window.checkoutConfig.shippingMethodsEnabled,

            /**
             * @override
             */
            initObservable: function () {
                var self = this;
                this._super();

                this.shippingRates.subscribe(function (rates) {
                    self.shippingRateGroups([]);
                    _.each(rates, function (rate) {
                        var carrierTitle = rate['carrier_title'];

                        if (self.shippingRateGroups.indexOf(carrierTitle) === -1) {
                            self.shippingRateGroups.push(carrierTitle);
                        }
                    });
                });

                self.supplierData(window.checkoutConfig.supplierData);

                var mappedShippingRates = $.map(
                    window.checkoutConfig.supplierShippingRates,
                    function(data) {
                        return {
                            'id': data.id,
                            'name': data.name,
                            'supplierId': parseInt(data.supplier_id),
                            'price': parseFloat(data.price),
                            'selected': ko.observable(data.selected ? data.id : 0)
                        };
                    }
                );
                self.supplierShippingRates(mappedShippingRates);

                return this;
            },

            /**
             * Get shipping rates for specific group based on title.
             * @returns Array
             */
            getRatesForGroup: function (shippingRateGroupTitle) {
                return _.filter(this.shippingRates(), function (rate) {
                    return shippingRateGroupTitle === rate['carrier_title'];
                });
            },

            /**
             * Format shipping price.
             * @returns {String}
             */
            getFormattedPrice: function (price) {
                return priceUtils.formatPrice(price, quote.getPriceFormat());
            },

            /**
             * Set shipping method.
             * @param {String} methodData
             * @returns bool
             */
            selectShippingMethod: function (methodData) {
                selectShippingMethodAction(methodData);
                checkoutData.setSelectedShippingRate(methodData['carrier_code'] + '_' + methodData['method_code']);

                return true;
            },

            getRatesForSupplier: function (supplierId) {
                return ko.utils.arrayFilter(this.supplierShippingRates(), function(rate) {
                    return rate.supplierId === supplierId;
                });
            },

            selectSupplierShippingMethod: function(rate) {
                $.ajax({
                    url: window.checkoutConfig.baseUrl+'/marketplace/checkout/setshippingprice',
                    type: 'POST',
                    data: {
                        price:  rate.price,
                        method_id: rate.id,
                        supplier_id: rate.supplierId
                    },
                    dataType: 'json',
                    success: function (data) {
                        $('#s_method_supplier')
                            .trigger('click');
                        $('#s_method_supplier')
                            .next('label')
                            .html('Supplier Shipping $'+data.price_total.toFixed(2)+'');
                    }
                });

                return true;
            }
        });
    }
);
