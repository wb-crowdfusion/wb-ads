<?php
/**
 * Provides miscellaneous filter methods for wbads templates.
 *
 *
 * @package     wb-ads
 * @version     $Id: $
 *
 */

class WbadsFilterer extends AbstractFilterer
{
    protected $siteId = '';
    /* IoC setter */
    public function setWbadsSiteId($siteId)
    {
        $this->siteId = $siteId;
    }
    /* public setter so templates can reset the param */
    public function setSiteId()
    {
        $this->siteId = trim((string) $this->getRequiredParameter('value'));
    }
    public function siteId()
    {
        return $this->siteId;
    }

    protected $enabled = true;
    /* IoC setter */
    public function setWbadsEnabled($enabled)
    {
        $this->enabled = $enabled;
    }
    /* public setter so templates can reset the param */
    public function setEnabled()
    {
        $this->enabled = StringUtils::strToBool((string) $this->getRequiredParameter('value'));
    }
    public function enabled()
    {
        return $this->enabled;
    }

    protected $placersEnabled = false;
    /* IoC setter */
    public function setWbadsPlacersEnabled($placersEnabled)
    {
        $this->placersEnabled = $placersEnabled;
    }
    /* public setter so templates can reset the param */
    public function setPlacersEnabled()
    {
        $this->placersEnabled = StringUtils::strToBool((string) $this->getRequiredParameter('value'));
    }
    public function placersEnabled()
    {
        return $this->placersEnabled;
    }

    protected $quantcastEnabled = true;
    /* IoC setter */
    public function setWbadsQuantcastEnabled($quantcastEnabled)
    {
        $this->quantcastEnabled = $quantcastEnabled;
    }
    /* public setter so templates can reset the param */
    public function setQuantcastEnabled()
    {
        $this->quantcastEnabled = StringUtils::strToBool((string) $this->getRequiredParameter('value'));
    }
    public function quantcastEnabled()
    {
        return $this->quantcastEnabled;
    }

    protected $audiencescienceEnabled = true;
    /* IoC setter */
    public function setWbadsAudiencescienceEnabled($audiencescienceEnabled)
    {
        $this->audiencescienceEnabled = $audiencescienceEnabled;
    }
    /* public setter so templates can reset the param */
    public function setAudiencescienceEnabled()
    {
        $this->audiencescienceEnabled = StringUtils::strToBool((string) $this->getRequiredParameter('value'));
    }
    public function audiencescienceEnabled()
    {
        return $this->audiencescienceEnabled;
    }
}
