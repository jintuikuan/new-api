package controller

import (
	"strconv"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

type channelGroupRequest struct {
	Name       string `json:"name"`
	ChannelIDs []int  `json:"channel_ids"`
}

func channelGroupResponse(g model.ChannelGroup) gin.H {
	return gin.H{"id": g.Id, "name": g.Name, "channel_ids": g.GetChannelIDs(), "created_at": g.CreatedAt, "updated_at": g.UpdatedAt}
}
func GetChannelGroups(c *gin.Context) {
	groups, err := model.ListChannelGroups()
	if err != nil {
		common.ApiError(c, err)
		return
	}
	out := make([]gin.H, 0, len(groups))
	for _, g := range groups {
		out = append(out, channelGroupResponse(g))
	}
	common.ApiSuccess(c, out)
}
func CreateChannelGroup(c *gin.Context) {
	var req channelGroupRequest
	if c.ShouldBindJSON(&req) != nil {
		c.JSON(400, gin.H{"success": false, "message": "参数无效"})
		return
	}
	g := model.ChannelGroup{Name: req.Name}
	if err := g.SetChannelIDs(req.ChannelIDs); err != nil {
		common.ApiError(c, err)
		return
	}
	if err := model.SaveChannelGroup(&g); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, channelGroupResponse(g))
}
func UpdateChannelGroup(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var req channelGroupRequest
	if c.ShouldBindJSON(&req) != nil {
		c.JSON(400, gin.H{"success": false, "message": "参数无效"})
		return
	}
	g, err := model.GetChannelGroup(id)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	g.Name = req.Name
	if err := g.SetChannelIDs(req.ChannelIDs); err != nil {
		common.ApiError(c, err)
		return
	}
	if err := model.SaveChannelGroup(g); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, channelGroupResponse(*g))
}
func DeleteChannelGroup(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	if err := model.DeleteChannelGroup(id); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, true)
}
func UpdateChannelGroupStatus(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	var req struct {
		Enabled bool `json:"enabled"`
	}
	if c.ShouldBindJSON(&req) != nil {
		c.JSON(400, gin.H{"success": false, "message": "参数无效"})
		return
	}
	g, err := model.GetChannelGroup(id)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	status := 0
	if req.Enabled {
		status = common.ChannelStatusEnabled
	}
	changed := 0
	for _, cid := range g.GetChannelIDs() {
		if model.UpdateChannelStatus(cid, "", status, "channel group operation") {
			changed++
		}
	}
	if changed > 0 {
		model.InitChannelCache()
	}
	common.ApiSuccess(c, changed)
}
