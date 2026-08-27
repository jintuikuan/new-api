package model

import (
	"errors"
	"strings"

	"github.com/QuantumNous/new-api/common"
)

type ChannelGroup struct {
	Id         int    `json:"id"`
	Name       string `json:"name" gorm:"uniqueIndex;size:128"`
	ChannelIDs string `json:"-" gorm:"type:text"`
	CreatedAt  int64  `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt  int64  `json:"updated_at" gorm:"autoUpdateTime"`
}

func (g *ChannelGroup) GetChannelIDs() []int {
	var ids []int
	_ = common.Unmarshal([]byte(g.ChannelIDs), &ids)
	return ids
}
func (g *ChannelGroup) SetChannelIDs(ids []int) error {
	data, err := common.Marshal(ids)
	if err != nil {
		return err
	}
	g.ChannelIDs = string(data)
	return nil
}

func ListChannelGroups() ([]ChannelGroup, error) {
	var groups []ChannelGroup
	if err := DB.Order("name asc").Find(&groups).Error; err != nil {
		return nil, err
	}
	return groups, nil
}
func GetChannelGroup(id int) (*ChannelGroup, error) {
	var g ChannelGroup
	if err := DB.First(&g, id).Error; err != nil {
		return nil, err
	}
	return &g, nil
}
func SaveChannelGroup(g *ChannelGroup) error {
	g.Name = strings.TrimSpace(g.Name)
	if g.Name == "" || len(g.GetChannelIDs()) == 0 {
		return errors.New("分组名称和渠道不能为空")
	}
	return DB.Save(g).Error
}
func DeleteChannelGroup(id int) error { return DB.Delete(&ChannelGroup{}, id).Error }
